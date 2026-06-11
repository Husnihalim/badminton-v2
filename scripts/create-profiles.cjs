#!/usr/bin/env node
/**
 * Create missing profiles for test users
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
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY not found in .env file')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const testUsers = [
  { id: '91b09a26-6f88-4896-a27d-27e7d15f73b7', email: 'superadmin@test.com', name: 'Super Admin', role: 'superadmin' },
  { id: 'fb25aca5-0641-4072-9583-bf52d0106516', email: 'owner@test.com', name: 'Club Owner', role: 'owner' },
  { id: 'f71dd86f-5c1b-4b04-b600-54a394e9ecfd', email: 'admin@test.com', name: 'Club Admin', role: 'admin' },
  { id: 'c3f7cdb4-3b53-42fb-8533-8b49bba5bd3b', email: 'member@test.com', name: 'Regular Member', role: 'member' },
]

async function createProfile(user) {
  console.log(`Creating profile for ${user.email}...`)
  
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })

  if (error) {
    console.log('❌ Error:', error.message)
    return false
  }

  console.log('✅ Profile created')
  return true
}

async function main() {
  console.log('=== Creating Profiles ===\n')
  
  for (const user of testUsers) {
    await createProfile(user)
  }
  
  console.log('\n=== Done ===')
}

main().catch(console.error)
