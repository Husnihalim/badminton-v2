#!/usr/bin/env node
/**
 * Test login directly with Supabase
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

async function testLogin(email, password) {
  console.log(`\nTesting login for: ${email}`)
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.log('❌ Login failed:', error.message)
    return false
  }

  console.log('✅ Login successful!')
  console.log('User ID:', data.user.id)
  console.log('Email:', data.user.email)
  console.log('Metadata:', data.user.user_metadata)
  
  // Check profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()
  
  if (profileError) {
    console.log('⚠️  Profile not found:', profileError.message)
  } else {
    console.log('Profile:', profile)
  }
  
  return true
}

async function main() {
  console.log('=== Testing Logins ===')
  
  await testLogin('owner@test.com', password)
  await testLogin('superadmin@test.com', password)
  await testLogin('admin@test.com', password)
  await testLogin('member@test.com', password)
}

main().catch(console.error)
