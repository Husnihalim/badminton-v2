#!/usr/bin/env node
/**
 * Verification script for the get_player_matches database RPC.
 */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Load .env file
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach((line) => {
      if (!line || line.trim().startsWith('#')) return
      const index = line.indexOf('=')
      if (index === -1) return
      process.env[line.slice(0, index).trim()] = line.slice(index + 1).trim()
    })
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function main() {
  console.log('=== Verifying get_player_matches RPC ===\n')

  // Sign in first to get an authenticated session (needed for profiles RLS)
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: 'superadmin@test.com',
    password: 'Test123!'
  })
  if (authError) {
    console.error('❌ Error: Auth sign-in failed:', authError)
    process.exit(1)
  }
  console.log('✓ Signed in as superadmin@test.com')

  // 1. Get a user profile from the database (e.g. Amir)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('name', 'Amir')
    .single()

  if (profileError || !profile) {
    console.error('❌ Error: Failed to retrieve user profile for "Amir":', profileError)
    process.exit(1)
  }

  console.log(`Found player: ${profile.name} (ID: ${profile.id})`)

  // 2. Call the RPC to retrieve the matches for this player
  const { data: matches, error: rpcError } = await supabase.rpc('get_player_matches', {
    p_user_id: profile.id,
    p_limit: 10
  })

  if (rpcError) {
    console.error('❌ Error: RPC execution failed:', rpcError)
    process.exit(1)
  }

  console.log(`✓ RPC executed successfully! Returned ${matches.length} matches.`)

  // 3. Validate match structure and participants list
  if (matches.length > 0) {
    const match = matches[0]
    console.log('\nValidating first match details:')
    console.log(`- Match ID: ${match.id}`)
    console.log(`- Sport: ${match.sport}`)
    console.log(`- Match Type: ${match.match_type}`)
    console.log(`- Date: ${match.match_date}`)
    console.log(`- Club: ${match.clubName}`)

    // Check participants structure
    if (Array.isArray(match.participants) && match.participants.length > 0) {
      console.log(`✓ Participants list found (${match.participants.length} players):`)
      match.participants.forEach(p => {
        console.log(`  * Team ${p.team}: ${p.name} (Is Guest: ${p.is_guest})`)
      })
    } else {
      console.error('❌ Error: Match has no participants or invalid structure')
      process.exit(1)
    }

    // Check score sets structure
    if (Array.isArray(match.score_sets) && match.score_sets.length > 0) {
      console.log(`✓ Score sets list found (${match.score_sets.length} sets):`)
      match.score_sets.forEach(s => {
        console.log(`  * Set ${s.set_number}: ${s.team1_score} - ${s.team2_score}`)
      })
    } else {
      console.error('❌ Error: Match has no scores or invalid structure')
      process.exit(1)
    }

    // Check if the user is indeed a participant
    const isUserParticipant = match.participants.some(p => p.user_id === profile.id)
    if (isUserParticipant) {
      console.log('✓ SUCCESS: User is confirmed as a participant in the returned matches!')
    } else {
      console.error('❌ Error: Returned match does not include the target user as a participant')
      process.exit(1)
    }
  } else {
    console.warn('⚠ Warning: No matches found for this player. Did seeding run correctly?')
  }
}

main().catch(console.error)
