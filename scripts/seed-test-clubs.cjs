#!/usr/bin/env node
/**
 * Seed 2 additional clubs (PV BC, Nova BC) with test users
 * Run after: node scripts/register-test-users.cjs && node scripts/seed-lep-bc.cjs
 * 
 * This creates:
 * 1. PV BC  - owned by admin@test.com, member@test.com as member
 * 2. Nova BC - owned by member@test.com, admin@test.com as admin
 */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function getUserByEmail(email) {
  let page = 1
  const perPage = 1000
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
    if (found) return found
    if (data.users.length < perPage) return null
    page += 1
  }
}

async function ensureUser(email, name) {
  let user = await getUserByEmail(email)
  if (!user) {
    console.log(`  Creating auth user ${email}...`)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: 'Test123!',
      email_confirm: true,
      user_metadata: { name },
    })
    if (error) throw error
    user = data.user
  }
  // Ensure profile exists
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: user.id, email, name, role: 'member' }, { onConflict: 'id' })
  if (profileError) throw profileError
  return user
}

async function ensureClub(name, description, location, city, inviteCode, ownerId) {
  const { data: existing } = await supabase
    .from('clubs')
    .select('*')
    .eq('name', name)
    .maybeSingle()

  const clubData = {
    name,
    description,
    location,
    city,
    sport_focus: ['badminton'],
    open_join: true,
    approval_required: true,
    invite_code: inviteCode,
    owner_id: ownerId,
  }

  if (existing) {
    const { data, error } = await supabase
      .from('clubs')
      .update(clubData)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('clubs')
    .insert(clubData)
    .select()
    .single()
  if (error) throw error
  return data
}

async function ensureMembership(clubId, userId, role) {
  const { data: existing } = await supabase
    .from('memberships')
    .select('*')
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) return existing

  const { data, error } = await supabase
    .from('memberships')
    .insert({ club_id: clubId, user_id: userId, role, status: 'active', approved_by: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

async function main() {
  console.log('=== Seeding Test Clubs ===\n')

  // Ensure test users exist
  console.log('Ensuring test users...')
  const adminUser = await ensureUser('admin@test.com', 'Club Admin')
  const memberUser = await ensureUser('member@test.com', 'Regular Member')
  console.log(`  admin@test.com: ${adminUser.id}`)
  console.log(`  member@test.com: ${memberUser.id}`)

  // --- PV BC ---
  console.log('\n--- PV BC ---')
  const pvbc = await ensureClub(
    'PV BC',
    'Persatuan Badminton Victory — a competitive badminton club.',
    'PV Badminton Hall',
    'Kuala Lumpur',
    'PVBC2026',
    adminUser.id
  )
  console.log(`  Club: ${pvbc.name} (${pvbc.id}), invite code: ${pvbc.invite_code}`)
  await ensureMembership(pvbc.id, adminUser.id, 'owner')
  console.log('  Owner: admin@test.com')
  await ensureMembership(pvbc.id, memberUser.id, 'member')
  console.log('  Member: member@test.com')

  // --- Nova BC ---
  console.log('\n--- Nova BC ---')
  const nova = await ensureClub(
    'Nova BC',
    'Nova Badminton Club — a friendly social badminton club.',
    'Nova Sports Complex',
    'Selangor',
    'NOVA2026',
    memberUser.id
  )
  console.log(`  Club: ${nova.name} (${nova.id}), invite code: ${nova.invite_code}`)
  await ensureMembership(nova.id, memberUser.id, 'owner')
  console.log('  Owner: member@test.com')
  await ensureMembership(nova.id, adminUser.id, 'admin')
  console.log('  Admin: admin@test.com')

  // Also add admin@test.com to LEP BC if not already
  console.log('\n--- LEP BC cross-membership ---')
  const { data: lep } = await supabase
    .from('clubs')
    .select('id')
    .eq('invite_code', 'LEPBC2026')
    .maybeSingle()
  if (lep) {
    await ensureMembership(lep.id, adminUser.id, 'member')
    console.log('  Added admin@test.com as member of LEP BC')
  }

  // Add members to LEP BC for competition testing
  const { data: allTestUsers } = await supabase.auth.admin.listUsers()
  const superadmin = allTestUsers.users.find(u => u.email === 'superadmin@test.com')
  const owner = allTestUsers.users.find(u => u.email === 'owner@test.com')
  if (lep && superadmin) {
    await ensureMembership(lep.id, superadmin.id, 'admin')
    console.log('  Added superadmin@test.com as admin of LEP BC')
  }
  if (lep && owner) {
    await ensureMembership(lep.id, owner.id, 'member')
    console.log('  Added owner@test.com as member of LEP BC')
  }

  console.log('\n=== Done ===')
  console.log('\nClub summary:')
  console.log('  LEP BC (LEPBC2026) - mohdhusni@gmail.com (owner), admin@test.com (member), superadmin@test.com (admin), owner@test.com (member)')
  console.log('  PV BC  (PVBC2026)  - admin@test.com (owner), member@test.com (member)')
  console.log('  Nova BC (NOVA2026) - member@test.com (owner), admin@test.com (admin)')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
