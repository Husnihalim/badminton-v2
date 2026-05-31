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
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
      process.env[key.trim()] = value.trim()
    }
  })
}

const SUPABASE_URL = 'https://yjetickebgngfttlvvur.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_KEY not found in .env file')
  console.error('Please create a .env file with: SUPABASE_SERVICE_KEY=your_service_role_key')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const testUsers = [
  { email: 'superadmin@test.com', password: 'Test123!', name: 'Super Admin', role: 'superadmin' },
  { email: 'owner@test.com', password: 'Test123!', name: 'Club Owner', role: 'owner' },
  { email: 'admin@test.com', password: 'Test123!', name: 'Club Admin', role: 'admin' },
  { email: 'member@test.com', password: 'Test123!', name: 'Regular Member', role: 'member' },
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
