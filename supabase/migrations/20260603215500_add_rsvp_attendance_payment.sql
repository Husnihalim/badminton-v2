-- Migration: Add attendance and payment tracking to RSVPs and sync automatically from match scores
-- Date: 2026-06-03

-- 1. Add attended and paid columns to event_rsvps
ALTER TABLE event_rsvps
  ADD COLUMN IF NOT EXISTS attended BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid BOOLEAN NOT NULL DEFAULT false;

-- 2. Create trigger to automatically mark attendance when a member records a match score in a session
CREATE OR REPLACE FUNCTION public.sync_attendance_from_match_participant()
RETURNS TRIGGER AS $$
DECLARE
  v_event_id UUID;
BEGIN
  -- Check if this participant is a registered user (not guest)
  IF NEW.user_id IS NOT NULL AND NEW.is_guest = FALSE THEN
    -- Get the event_id for the match
    SELECT event_id INTO v_event_id FROM matches WHERE id = NEW.match_id;
    
    -- If the match is linked to an event/session, mark attendance
    IF v_event_id IS NOT NULL THEN
      INSERT INTO event_rsvps (event_id, user_id, status, attended, paid)
      VALUES (v_event_id, NEW.user_id, 'going', true, false)
      ON CONFLICT (event_id, user_id)
      DO UPDATE SET attended = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_match_participant_recorded ON match_participants;

CREATE TRIGGER on_match_participant_recorded
  AFTER INSERT OR UPDATE ON match_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_attendance_from_match_participant();
