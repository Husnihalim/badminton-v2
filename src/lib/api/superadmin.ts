import { supabase } from '../supabase'

export type SuperadminDashboardStats = {
  total_users: number
  total_clubs: number
  total_matches: number
  total_events: number
  total_rsvps: number
  total_crashes: number
  total_feedback: number
  sports_distribution: Record<string, number>
  user_registration_trend: { date: string; count: number }[]
  matches_trend: { date: string; count: number }[]
  crash_trend: { date: string; count: number }[]
}

export type SuperadminUserRow = {
  id: string
  name: string
  display_name: string
  email: string
  role: string
  avatar_url: string | null
  created_at: string
  clubs_count: number
  matches_count: number
  win_rate: number
}

export type SuperadminClubRow = {
  id: string
  name: string
  sport_focus: string[]
  location: string | null
  city: string | null
  created_at: string
  owner_name: string | null
  owner_email: string | null
  members_count: number
  matches_count: number
  events_count: number
}

export type PlatformLog = {
  id: string
  user_id: string | null
  event_type: string
  message: string
  severity: 'info' | 'warning' | 'error'
  metadata: Record<string, unknown>
  ip_address: string | null
  created_at: string
  profiles?: { name: string; email: string } | null
}

export type CrashReport = {
  id: string
  user_id: string | null
  error_name: string
  error_message: string
  stack_trace: string | null
  url: string | null
  user_agent: string | null
  created_at: string
  profiles?: { name: string; email: string } | null
}

export type UserFeedback = {
  id: string
  user_id: string | null
  type: 'bug' | 'suggestion' | 'other'
  message: string
  rating: number | null
  created_at: string
  profiles?: { name: string; email: string } | null
}

export async function getSuperadminDashboardStats(): Promise<SuperadminDashboardStats> {
  const { data, error } = await supabase.rpc('get_superadmin_dashboard_stats')
  if (error) {
    console.error('Error fetching superadmin dashboard stats:', error)
    throw error
  }
  return data as SuperadminDashboardStats
}

export async function getSuperadminUsersList(): Promise<SuperadminUserRow[]> {
  const { data, error } = await supabase.rpc('get_superadmin_users_list')
  if (error) {
    console.error('Error fetching superadmin users list:', error)
    throw error
  }
  return (data as SuperadminUserRow[]) || []
}

export async function getSuperadminClubsList(): Promise<SuperadminClubRow[]> {
  const { data, error } = await supabase.rpc('get_superadmin_clubs_list')
  if (error) {
    console.error('Error fetching superadmin clubs list:', error)
    throw error
  }
  return (data as SuperadminClubRow[]) || []
}

export async function superadminUpdateUserRole(userId: string, role: 'superadmin' | 'member'): Promise<void> {
  const { error } = await supabase.rpc('superadmin_update_user_role', {
    target_user_id: userId,
    new_role: role
  })
  if (error) {
    console.error('Error updating user role by superadmin:', error)
    throw error
  }
}

export async function requestClubDeletion(clubId: string): Promise<void> {
  const { error } = await supabase
    .from('club_deletion_requests')
    .insert({ club_id: clubId, status: 'pending' })
    .single();

  if (error) {
    console.error('Error creating club deletion request:', error);
    throw error;
  }
}

export async function deleteClub(clubId: string): Promise<void> {
  const { error } = await supabase
    .from('clubs')
    .delete()
    .eq('id', clubId)
  if (error) {
    console.error('Error deleting club:', error)
    throw error
  }
}

export async function logPlatformEvent(
  eventType: string,
  message: string,
  severity: 'info' | 'warning' | 'error' = 'info',
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('platform_logs')
    .insert({
      user_id: user?.id || null,
      event_type: eventType,
      message,
      severity,
      metadata,
    } as never)
  if (error) {
    console.error('Failed to log platform event:', error)
  }
}

export async function logCrashReport(
  errorName: string,
  errorMessage: string,
  stackTrace: string | null = null,
  url: string | null = null
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('crash_reports')
    .insert({
      user_id: user?.id || null,
      error_name: errorName,
      error_message: errorMessage,
      stack_trace: stackTrace,
      url: url || window.location.href,
      user_agent: navigator.userAgent,
    } as never)
  if (error) {
    console.error('Failed to log crash report:', error)
  }
}

export async function submitUserFeedback(
  type: 'bug' | 'suggestion' | 'other',
  message: string,
  rating: number | null = null
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be authenticated to submit feedback')
  
  const { error } = await supabase
    .from('user_feedback')
    .insert({
      user_id: user.id,
      type,
      message,
      rating,
    } as never)
  if (error) {
    console.error('Failed to submit user feedback:', error)
    throw error
  }
}

export async function getPlatformLogs(limit = 100): Promise<PlatformLog[]> {
  const { data, error } = await supabase
    .from('platform_logs')
    .select('*, profiles(name, email)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('Error fetching platform logs:', error)
    return []
  }
  return (data as unknown as PlatformLog[]) || []
}

export async function getCrashReports(limit = 50): Promise<CrashReport[]> {
  const { data, error } = await supabase
    .from('crash_reports')
    .select('*, profiles(name, email)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('Error fetching crash reports:', error)
    return []
  }
  return (data as unknown as CrashReport[]) || []
}

export async function getUserFeedback(limit = 50): Promise<UserFeedback[]> {
  const { data, error } = await supabase
    .from('user_feedback')
    .select('*, profiles(name, email)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('Error fetching user feedback:', error)
    return []
  }
  return (data as unknown as UserFeedback[]) || []
}
