import { supabase } from '../supabase'
import type { PlayerGear, PlayerSocialLinks, PlayerDashboardData } from '../../types'
import { mockUsers } from '../mockShowcase'

export async function ensureCurrentUserProfile(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Must be authenticated')
  }

  const { data: existingProfile, error: selectError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (selectError) {
    console.error('Error checking profile:', selectError)
    throw selectError
  }

  if (existingProfile) return

  const email = user.email || ''
  const name = user.user_metadata?.name || email.split('@')[0] || 'Member'

  const { error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email,
      name,
      role: 'member',
    } as never)

  if (insertError) {
    console.error('Error creating missing profile:', insertError)
    throw insertError
  }
}

export async function getProfile(userId: string) {
  if (userId && userId.startsWith('mock-')) {
    return mockUsers[userId] || null
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return data
}

export type ProfileUpdates = {
  display_name?: string | null
  phone?: string | null
  city?: string | null
  bio?: string | null
  preferred_sport?: string | null
  avatar_url?: string | null
  is_private?: boolean | null
  social_links?: PlayerSocialLinks | null
  gear?: PlayerGear | null
}

export async function updateProfile(userId: string, updates: ProfileUpdates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates as never)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    throw error
  }

  return data
}

export async function uploadProfilePhoto(userId: string, file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filePath = `${userId}/avatar-${Date.now()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from('profile-photos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (uploadError) {
    console.error('Error uploading profile photo:', uploadError)
    throw uploadError
  }

  const { data } = supabase.storage
    .from('profile-photos')
    .getPublicUrl(filePath)

  await updateProfile(userId, { avatar_url: data.publicUrl })
  return data.publicUrl
}

export async function getPlayerDashboard(userId: string): Promise<PlayerDashboardData> {
  const { data, error } = await supabase.rpc('get_player_dashboard', {
    p_user_id: userId,
  })

  if (error) {
    console.error('Error fetching player dashboard:', error)
    throw error
  }

  return data as PlayerDashboardData
}
