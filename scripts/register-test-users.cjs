#!/usr/bin/env node
/**
 * Script to register test users for KelabSukan
 * Run with: node scripts/register-test-users.js
 * 
 * This uses the Supabase Auth API to create test users
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
  console.error('❌ Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in .env file')
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
  { email: 'superadmin@test.com', password, name: 'Super Admin' },
  { email: 'owner@test.com', password, name: 'Club Owner' },
  { email: 'admin@test.com', password, name: 'Club Admin' },
  { email: 'member@test.com', password, name: 'Regular Member' },
]

async function registerUser(user) {
  try {
    console.log(`Registering ${user.email}...`)
    
    const { data, error } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
      options: {
        data: {
          name: user.name,
        },
      },
    })

    if (error) {
      if (error.message.includes('already registered')) {
        console.log(`  ✓ ${user.email} already exists`)
        return { exists: true }
      }
      console.error(`  ✗ Error: ${error.message}`)
      return { error }
    }

    console.log(`  ✓ ${user.email} registered successfully`)
    return { success: true, user: data.user }
  } catch (err) {
    console.error(`  ✗ Exception: ${err.message}`)
    return { error: err }
  }
}

async function main() {
  console.log('=== KelabSukan Test User Registration ===\n')
  
  for (const user of testUsers) {
    await registerUser(user)
  }

  console.log('\n=== Registration Complete ===')
  console.log('\nTest accounts:')
  testUsers.forEach(u => {
    console.log(`  ${u.email} / ${u.password} (${u.name})`)
  })
  console.log('\nYou can now log in at: https://kelabsukan.netlify.app/login')
}

main().catch(console.error)
