ALTER TABLE memberships
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE memberships
SET updated_at = COALESCE(updated_at, joined_at, NOW())
WHERE updated_at IS NULL;

DROP TRIGGER IF EXISTS update_memberships_updated_at ON memberships;

CREATE TRIGGER update_memberships_updated_at
    BEFORE UPDATE ON memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
