-- Migration: Grant EXECUTE permissions on private helper functions to PUBLIC
-- Created: 2026-06-30

GRANT EXECUTE ON FUNCTION private.is_active_club_member(UUID) TO public;
GRANT EXECUTE ON FUNCTION private.is_club_admin(UUID) TO public;
GRANT EXECUTE ON FUNCTION private.share_any_club(UUID, UUID) TO public;
GRANT EXECUTE ON FUNCTION private.is_platform_superadmin() TO public;
