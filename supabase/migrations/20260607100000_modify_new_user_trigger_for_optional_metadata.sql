-- Migration: Update new user trigger to insert optional profile/gear metadata and trigger a welcome notification.

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
        is_private
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
        COALESCE((NEW.raw_user_meta_data->>'is_private')::boolean, false)
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
