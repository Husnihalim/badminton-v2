#!/usr/bin/env node
/**
 * Check if test users exist and try to sign in
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

const isProduction = SUPABASE_URL.includes('yjetickebgngfttlvvur.supabase.co')
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD

if (isProduction && !TEST_PASSWORD) {
  console.error('❌ Error: Running against production but TEST_USER_PASSWORD is not set in .env')
  process.exit(1)
}

const password = TEST_PASSWORD || 'Test123!'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const testUsers = [
  { email: 'superadmin@test.com', password },
  { email: 'owner@test.com', password },
  { email: 'admin@test.com', password },
  { email: 'member@test.com', password },
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
