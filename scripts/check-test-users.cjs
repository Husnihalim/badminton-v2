#!/usr/bin/env node
/**
 * Check if test users exist and try to sign in
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://yjetickebgngfttlvvur.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_YD_mvKPRiD3x_4n56zYrGQ_MO1b5bcK'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const testUsers = [
  { email: 'superadmin@test.com', password: 'Test123!' },
  { email: 'owner@test.com', password: 'Test123!' },
  { email: 'admin@test.com', password: 'Test123!' },
  { email: 'member@test.com', password: 'Test123!' },
]

async function checkUser(user) {
  try {
    console.log(`Checking ${user.email}...`)
    
    // Try to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        console.log(`  ⚠ User does not exist or wrong password`)
        return { exists: false }
      }
      console.log(`  ✗ Error: ${error.message}`)
      return { error }
    }

    console.log(`  ✓ User exists and can log in`)
    console.log(`    User ID: ${data.user?.id}`)
    console.log(`    Role: ${data.user?.user_metadata?.role || 'member'}`)
    
    // Sign out
    await supabase.auth.signOut()
    
    return { exists: true, user: data.user }
  } catch (err) {
    console.error(`  ✗ Exception: ${err.message}`)
    return { error: err }
  }
}

async function main() {
  console.log('=== Checking Test Users ===\n')
  
  for (const user of testUsers) {
    await checkUser(user)
    console.log('')
  }
}

main().catch(console.error)
