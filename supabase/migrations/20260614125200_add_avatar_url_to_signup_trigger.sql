-- Migration: Update new user trigger to capture avatar_url from metadata during signup and backfill existing blank profiles.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if profile already exists
    IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
        RETURN NEW;
    END IF;
    
    -- Insert the profile
    INSERT INTO profiles (
        id, 
        email, 
        name, 
        role, 
        display_name, 
        city, 
        preferred_sport, 
        gear, 
        is_private,
        avatar_url
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'member'),
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'city',
        COALESCE(NEW.raw_user_meta_data->>'preferred_sport', 'badminton'),
        COALESCE(NEW.raw_user_meta_data->'gear', '{}'::jsonb),
        COALESCE((NEW.raw_user_meta_data->>'is_private')::boolean, false),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    
    -- Insert a welcome reminder notification to complete player card
    INSERT INTO notifications (user_id, type, title, message, data, read)
    VALUES (
        NEW.id,
        'announcement',
        'Welcome to KelabSukan! ⚡',
        'Complete your Player Card now! Add your playstyle and racket specs (weight, balance, stiffness) to unlock personalized matches and stories.',
        '{"path": "/profile"}'::jsonb,
        false
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't prevent user creation
        RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill existing profiles that do not have an avatar_url
UPDATE profiles
SET avatar_url = (
    CASE (ABS(HASHTEXT(id::text)) % 6)
        WHEN 0 THEN 'data:image/svg+xml;utf8,%3Csvg%20viewBox%3D%220%200%20100%20100%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22bg1%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%22100%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%234f46e5%22%20%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%2306b6d4%22%20%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2248%22%20fill%3D%22url(%23bg1)%22%20%2F%3E%3Cpath%20d%3D%22M30%2065%20L50%2025%20L70%2065%20Z%22%20fill%3D%22%23ffffff%22%20opacity%3D%220.9%22%20%2F%3E%3Cpath%20d%3D%22M38%2065%20L50%2035%20L62%2065%20Z%22%20fill%3D%22%23e2e8f0%22%20%2F%3E%3Cpath%20d%3D%22M30%2065%20Q50%2072%2070%2065%22%20stroke%3D%22%23ef4444%22%20stroke-width%3D%226%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20%2F%3E%3Cpath%20d%3D%22M42%2025%20H58%20V28%20H42%20Z%22%20fill%3D%22%23ef4444%22%20%2F%3E%3Crect%20x%3D%2235%22%20y%3D%2242%22%20width%3D%2214%22%20height%3D%2210%22%20rx%3D%223%22%20fill%3D%22%231e293b%22%20%2F%3E%3Crect%20x%3D%2251%22%20y%3D%2242%22%20width%3D%2214%22%20height%3D%2210%22%20rx%3D%223%22%20fill%3D%22%231e293b%22%20%2F%3E%3Cpath%20d%3D%22M49%2047%20H51%22%20stroke%3D%22%231e293b%22%20stroke-width%3D%222%22%20%2F%3E%3Cpath%20d%3D%22M45%2058%20Q50%2063%2055%2058%22%20stroke%3D%22%231e293b%22%20stroke-width%3D%223%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20%2F%3E%3C%2Fsvg%3E'
        WHEN 1 THEN 'data:image/svg+xml;utf8,%3Csvg%20viewBox%3D%220%200%20100%20100%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22bg2%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%22100%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23f97316%22%20%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23f43f5e%22%20%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2248%22%20fill%3D%22url(%23bg2)%22%20%2F%3E%3Ccircle%20cx%3D%2250%20cy%3D%2252%22%20r%3D%2228%22%20fill%3D%22%23ffedd5%22%20%2F%3E%3Cpath%20d%3D%22M28%2035%20Q22%2020%2035%2025%20Z%22%20fill%3D%22%23f97316%22%20%2F%3E%3Cpath%20d%3D%22M72%2035%20Q78%2020%2065%2025%20Z%22%20fill%3D%22%23f97316%22%20%2F%3E%3Cpath%20d%3D%22M50%2024%20L50%2032%22%20stroke%3D%22%23475569%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20%2F%3E%3Cpath%20d%3D%22M24%2050%20H32%22%20stroke%3D%22%23475569%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20%2F%3E%3Cpath%20d%3D%22M76%2050%20H68%22%20stroke%3D%22%23475569%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20%2F%3E%3Crect%20x%3D%2223%22%20y%3D%2236%22%20width%3D%2254%22%20height%3D%228%22%20rx%3D%222%22%20fill%3D%22%233b82f6%22%20%2F%3E%3Crect%20x%3D%2242%22%20y%3D%2236%22%20width%3D%2216%22%20height%3D%228%22%20fill%3D%22%23ffffff%22%20%2F%3E%3Cpath%20d%3D%22M46%2040%20L54%2040%22%20stroke%3D%22%23ef4444%22%20stroke-width%3D%222%22%20%2F%3E%3Ccircle%20cx%3D%2240%22%20cy%3D%2252%22%20r%3D%223%22%20fill%3D%22%231e293b%22%20%2F%3E%3Ccircle%20cx%3D%2260%22%20cy%3D%2252%22%20r%3D%223%22%20fill%3D%22%231e293b%22%20%2F%3E%3Ccircle%20cx%3D%2234%22%20cy%3D%2258%22%20r%3D%223%22%20fill%3D%22%23fda4af%22%20%2F%3E%3Ccircle%20cx%3D%2266%22%20cy%3D%2258%22%20r%3D%223%22%20fill%3D%22%23fda4af%22%20%2F%3E%3Cpath%20d%3D%22M47%2058%20Q50%2056%2053%2058%22%20stroke%3D%22%231e293b%22%20fill%3D%22none%22%20%2F%3E%3Cpath%20d%3D%22M50%2058%20Q50%2063%2050%2063%22%20stroke%3D%22%231e293b%22%20stroke-width%3D%222%22%20%2F%3E%3C%2Fsvg%3E'
        WHEN 2 THEN 'data:image/svg+xml;utf8,%3Csvg%20viewBox%3D%220%200%20100%20100%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22bg3%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%22100%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%230d9488%22%20%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%2310b981%22%20%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2248%22%20fill%3D%22url(%23bg3)%22%20%2F%3E%3Cpolygon%20points%3D%2225%2C25%2040%2C48%2020%2C48%22%20fill%3D%22%23ea580c%22%20%2F%3E%3Cpolygon%20points%3D%2275%2C25%2060%2C48%2080%2C48%22%20fill%3D%22%23ea580c%22%20%2F%3E%3Cpolygon%20points%3D%2228%2C30%2037%2C45%2024%2C45%22%20fill%3D%22%23ffedd5%22%20%2F%3E%3Cpolygon%20points%3D%2272%2C30%2063%2C45%2076%2C45%22%20fill%3D%22%23ffedd5%22%20%2F%3E%3Cpolygon%20points%3D%2220%2C48%2080%2C48%2050%2C80%22%20fill%3D%22%23f97316%22%20%2F%3E%3Cpolygon%20points%3D%2232%2C48%2068%2C48%2050%2C80%22%20fill%3D%22%23ffffff%22%20%2F%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2278%22%20r%3D%224%22%20fill%3D%22%231e293b%22%20%2F%3E%3Crect%20x%3D%2223%22%20y%3D%2244%22%20width%3D%2254%22%20height%3D%227%22%20rx%3D%221%22%20fill%3D%22%23ccff00%22%20%2F%3E%3Cpath%20d%3D%22M35%2055%20Q40%2050%2045%2055%22%20stroke%3D%22%231e293b%22%20stroke-width%3D%223%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20%2F%3E%3Cpath%20d%3D%22M65%2055%20Q60%2050%2055%2055%22%20stroke%3D%22%231e293b%22%20stroke-width%3D%223%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20%2F%3E%3C%2Fsvg%3E'
        WHEN 3 THEN 'data:image/svg+xml;utf8,%3Csvg%20viewBox%3D%220%200%20100%20100%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22bg4%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%22100%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%237c3aed%22%20%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23db2777%22%20%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2248%22%20fill%3D%22url(%23bg4)%22%20%2F%3E%3Cpath%20d%3D%22M25%2035%20Q15%2045%2025%2055%22%20stroke%3D%22%23fbbf24%22%20stroke-width%3D%226%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20%2F%3E%3Cpath%20d%3D%22M75%2035%20Q85%2045%2075%2055%22%20stroke%3D%22%23fbbf24%22%20stroke-width%3D%226%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20%2F%3E%3Cpath%20d%3D%22M30%2030%20H70%20V52%20C70%2062%2060%2070%2050%2070%20C40%2070%2030%2062%2030%2052%20Z%22%20fill%3D%22%23f59e0b%22%20%2F%3E%3Cpath%20d%3D%22M50%2070%20V82%22%20stroke%3D%22%23f59e0b%22%20stroke-width%3D%228%22%20stroke-linecap%3D%22round%22%20%2F%3E%3Cpath%20d%3D%22M35%2082%20H65%22%20stroke%3D%22%23f59e0b%22%20stroke-width%3D%226%22%20stroke-linecap%3D%22round%22%20%2F%3E%3Crect%20x%3D%2230%22%20y%3D%2236%22%20width%3D%2240%22%20height%3D%227%22%20fill%3D%22%2310b981%22%20%2F%3E%3Cpath%20d%3D%22M40%2048%20C40%2048%2042%2045%2044%2048%22%20stroke%3D%22%231e293b%22%20stroke-width%3D%222.5%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20%2F%3E%3Cpath%20d%3D%22M56%2046%20L62%2050%20M62%2046%20L56%2050%22%20stroke%3D%22%231e293b%22%20stroke-linecap%3D%22round%22%20%2F%3E%3Cpath%20d%3D%22M47%2057%20Q50%2061%2053%2057%22%20stroke%3D%22%231e293b%22%20stroke-width%3D%222.5%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20%2F%3E%3Cpolygon%20points%3D%2250%2C18%2052%2C23%2057%2C23%2053%2C26%2055%2C31%2050%2C28%2045%2C31%2047%2C26%2043%2C23%2048%2C23%22%20fill%3D%22%23ffffff%22%20%2F%3E%3C%2Fsvg%3E'
        WHEN 4 THEN 'data:image/svg+xml;utf8,%3Csvg%20viewBox%3D%220%200%20100%20100%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22bg5%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%22100%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%231e293b%22%20%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%230f172a%22%20%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2248%22%20fill%3D%22url(%23bg5)%22%20%2F%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2232%22%20fill%3D%22%23ccff00%22%20opacity%3D%220.15%22%20filter%3D%22blur(8px)%22%20%2F%3E%3Cpath%20d%3D%22M32%2070%20L50%2025%20L68%2070%20Z%22%20fill%3D%22%23ccff00%22%20opacity%3D%220.8%22%20%2F%3E%3Cpath%20d%3D%22M40%2070%20L50%2035%20L60%2070%20Z%22%20fill%3D%22%23ffffff%22%20%2F%3E%3Cpath%20d%3D%22M32%2070%20Q50%2076%2068%2070%22%20stroke%3D%22%233b82f6%22%20stroke-width%3D%225%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20%2F%3E%3Cpath%20d%3D%22M44%2024%20H56%20V27%20H44%20Z%22%20fill%3D%22%233b82f6%22%20%2F%3E%3Cpolygon%20points%3D%2240%2C40%2044%2C45%2039%2C45%2042%2C51%2038%2C47%2041%2C47%22%20fill%3D%22%233b82f6%22%20%2F%3E%3Cpolygon%20points%3D%2260%2C40%2064%2C45%2059%2C45%2062%2C51%2058%2C47%2061%2C47%22%20fill%3D%22%233b82f6%22%20%2F%3E%3Cpath%20d%3D%22M46%2058%20Q50%2063%2054%2058%22%20stroke%3D%22%23ffffff%22%20stroke-width%3D%222.5%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20%2F%3E%3C%2Fsvg%3E'
        ELSE 'data:image/svg+xml;utf8,%3Csvg%20viewBox%3D%220%200%20100%20100%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22bg6%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%22100%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%232563eb%22%20%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23c084fc%22%20%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2248%22%20fill%3D%22url(%23bg6)%22%20%2F%3E%3Crect%20x%3D%2228%22%20y%3D%2228%22%20width%3D%2244%22%20height%3D%2244%22%20rx%3D%2214%22%20fill%3D%22%230f172a%22%20%2F%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2242%22%20r%3D%2222%22%20fill%3D%22%231e293b%22%20%2F%3E%3Cpath%20d%3D%22M28%2042%20H72%20V54%20C72%2058%2068%2062%2062%2062%20H38%20C32%2062%2028%2058%2028%2054%20Z%22%20fill%3D%22%23ccff00%22%20opacity%3D%220.9%22%20%2F%3E%3Cline%20x1%3D%2234%22%20y1%3D%2242%22%20x2%3D%2244%22%20y2%3D%2262%22%20stroke%3D%22%230f172a%22%20stroke-width%3D%221.5%22%20opacity%3D%220.6%22%20%2F%3E%3Cline%20x1%3D%2242%22%20y1%3D%2242%22%20x2%3D%2252%20y2%3D%2262%22%20stroke%3D%22%230f172a%22%20stroke-width%3D%221.5%22%20opacity%3D%220.6%22%20%2F%3E%3Cline%20x1%3D%2250%22%20y1%3D%2242%22%20x2%3D%2260%20y2%3D%2262%22%20stroke%3D%22%230f172a%22%20stroke-width%3D%221.5%22%20opacity%3D%220.6%22%20%2F%3E%3Cline%20x1%3D%2258%22%20y1%3D%2242%22%20x2%3D%2268%20y2%3D%2262%22%20stroke%3D%22%230f172a%22%20stroke-width%3D%221.5%22%20opacity%3D%220.6%22%20%2F%3E%3Cline%20x1%3D%2228%22%20y1%3D%2250%22%20x2%3D%2272%20y2%3D%2250%22%20stroke%3D%22%230f172a%22%20stroke-width%3D%221.5%22%20opacity%3D%220.6%22%20%2F%3E%3Cline%20x1%3D%2228%22%20y1%3D%2256%22%20x2%3D%2272%20y2%3D%2256%22%20stroke%3D%22%230f172a%22%20stroke-width%3D%221.5%22%20opacity%3D%220.6%22%20%2F%3E%3Crect%20x%3D%2223%22%20y%3D%2242%22%20width%3D%226%22%20height%3D%2216%22%20rx%3D%222%22%20fill%3D%22%23334155%22%20%2F%3E%3Crect%20x%3D%2271%22%20y%3D%2242%22%20width%3D%226%22%20height%3D%2216%22%20rx%3D%222%22%20fill%3D%22%23334155%22%20%2F%3E%3C%2Fsvg%3E'
    END
)
WHERE avatar_url IS NULL;
