-- Keep user-provided text fields bounded so accidental huge pastes do not slow
-- pages or create oversized notification/activity rows.

ALTER TABLE profiles
  ADD CONSTRAINT profiles_display_name_length CHECK (display_name IS NULL OR char_length(display_name) <= 120) NOT VALID,
  ADD CONSTRAINT profiles_phone_length CHECK (phone IS NULL OR char_length(phone) <= 40) NOT VALID,
  ADD CONSTRAINT profiles_city_length CHECK (city IS NULL OR char_length(city) <= 120) NOT VALID,
  ADD CONSTRAINT profiles_bio_length CHECK (bio IS NULL OR char_length(bio) <= 1000) NOT VALID,
  ADD CONSTRAINT profiles_preferred_sport_length CHECK (preferred_sport IS NULL OR char_length(preferred_sport) <= 80) NOT VALID;

ALTER TABLE clubs
  ADD CONSTRAINT clubs_name_length CHECK (char_length(name) <= 120) NOT VALID,
  ADD CONSTRAINT clubs_description_length CHECK (description IS NULL OR char_length(description) <= 1000) NOT VALID,
  ADD CONSTRAINT clubs_location_length CHECK (location IS NULL OR char_length(location) <= 200) NOT VALID,
  ADD CONSTRAINT clubs_city_length CHECK (city IS NULL OR char_length(city) <= 120) NOT VALID;

ALTER TABLE events
  ADD CONSTRAINT events_title_length CHECK (char_length(title) <= 120) NOT VALID,
  ADD CONSTRAINT events_location_length CHECK (location IS NULL OR char_length(location) <= 200) NOT VALID,
  ADD CONSTRAINT events_cost_note_length CHECK (cost_note IS NULL OR char_length(cost_note) <= 200) NOT VALID;

ALTER TABLE matches
  ADD CONSTRAINT matches_title_length CHECK (title IS NULL OR char_length(title) <= 120) NOT VALID,
  ADD CONSTRAINT matches_sport_length CHECK (char_length(sport) <= 80) NOT VALID;

ALTER TABLE match_participants
  ADD CONSTRAINT match_participants_guest_name_length CHECK (guest_name IS NULL OR char_length(guest_name) <= 120) NOT VALID;

ALTER TABLE club_messages
  ADD CONSTRAINT club_messages_title_length CHECK (char_length(title) <= 120) NOT VALID,
  ADD CONSTRAINT club_messages_message_length CHECK (char_length(message) <= 1000) NOT VALID;
