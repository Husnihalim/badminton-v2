#!/usr/bin/env node
/**
 * Test login directly with Supabase
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://yjetickebgngfttlvvur.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_YD_mvKPRiD3x_4n56zYrGQ_MO1b5bcK'

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
  
  await testLogin('owner@test.com', 'Test123!')
  await testLogin('superadmin@test.com', 'Test123!')
  await testLogin('admin@test.com', 'Test123!')
  await testLogin('member@test.com', 'Test123!')
}

main().catch(console.error)
