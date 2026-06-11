#!/usr/bin/env node
/**
 * Script to create test users using service_role key
 * Requires: SUPABASE_SERVICE_KEY in .env file
 * 
 * Run with: node scripts/create-test-users.cjs
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

const isProduction = SUPABASE_URL.includes('yjetickebgngfttlvvur.supabase.co')
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD

if (isProduction && !TEST_PASSWORD) {
  console.error('❌ Error: Running against production but TEST_USER_PASSWORD is not set in .env')
  process.exit(1)
}

const password = TEST_PASSWORD || 'Test123!'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const testUsers = [
  { email: 'superadmin@test.com', password, name: 'Super Admin', role: 'superadmin' },
  { email: 'owner@test.com', password, name: 'Club Owner', role: 'owner' },
  { email: 'admin@test.com', password, name: 'Club Admin', role: 'admin' },
  { email: 'member@test.com', password, name: 'Regular Member', role: 'member' },
]

async function createUser(user) {
  try {
    console.log(`Creating ${user.email}...`)
    
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        name: user.name,
        role: user.role,
      },
    })

    if (error) {
      if (error.message.includes('already been registered')) {
        console.log(`  ⚠ ${user.email} already exists`)
        return { exists: true }
      }
      console.error(`  ❌ Error: ${error.message}`)
      return { error }
    }

    console.log(`  ✅ ${user.email} created successfully`)
    return { success: true, user: data.user }
  } catch (err) {
    console.error(`  ❌ Exception: ${err.message}`)
    return { error: err }
  }
}

async function main() {
  console.log('=== KelabSukan Test User Creation ===\n')
  console.log('Using service_role key from .env file\n')
  
  for (const user of testUsers) {
    await createUser(user)
  }

  console.log('\n=== Complete ===')
  console.log('\nTest accounts:')
  testUsers.forEach(u => {
    console.log(`  ${u.email} / ${u.password} (${u.name})`)
  })
  console.log('\nYou can now log in at: https://kelabsukan.netlify.app/login')
}

main().catch(console.error)
