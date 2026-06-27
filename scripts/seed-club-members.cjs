#!/usr/bin/env node
/**
 * Seed 10+ regular members + admin accounts for all test clubs
 * Run after: node scripts/seed-test-clubs.cjs && node scripts/seed-mock-competition.cjs
 *
 * This adds:
 * - PV BC: 10 regular members + admin account
 * - Nova BC: 10 regular members
 * - Smashers PJ: adds admin account
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
  console.error('VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY not found in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function getUserByEmail(email) {
  let page = 1
  const perPage = 1000
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
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
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: user.id, email, name, role: 'member' }, { onConflict: 'id' })
  if (profileError) throw profileError
  return user
}

async function ensureMembership(clubId, userId, role) {
  const { data: existing } = await supabase
    .from('memberships')
    .select('*')
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    if (existing.role !== role) {
      await supabase.from('memberships').update({ role }).eq('id', existing.id)
    }
    return existing
  }

  const { data, error } = await supabase
    .from('memberships')
    .insert({ club_id: clubId, user_id: userId, role, status: 'active', approved_by: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

async function getClubByName(name) {
  const { data } = await supabase.from('clubs').select('*').eq('name', name).maybeSingle()
  return data
}

async function main() {
  console.log('=== Seeding Club Members ===\n')

  // ---------- PV BC ----------
  console.log('--- PV BC ---')
  const pvbc = await getClubByName('PV BC')
  if (!pvbc) { console.log('  PV BC not found, skipping'); return }

  // Ensure admin@test.com has admin role in PV BC (currently owner)
  const adminUser = await ensureUser('admin@test.com', 'Club Admin')
  await ensureMembership(pvbc.id, adminUser.id, 'owner')

  // Create 10 regular members for PV BC
  for (let i = 1; i <= 10; i++) {
    const email = `pv${i}@test.com`
    const name = `PV Player ${i}`
    const user = await ensureUser(email, name)
    await ensureMembership(pvbc.id, user.id, 'member')
    console.log(`  Added ${email} as member`)
  }

  // ---------- Nova BC ----------
  console.log('\n--- Nova BC ---')
  const nova = await getClubByName('Nova BC')
  if (!nova) { console.log('  Nova BC not found, skipping'); return }

  // Create 10 regular members for Nova BC
  for (let i = 1; i <= 10; i++) {
    const email = `nova${i}@test.com`
    const name = `Nova Player ${i}`
    const user = await ensureUser(email, name)
    await ensureMembership(nova.id, user.id, 'member')
    console.log(`  Added ${email} as member`)
  }

  // Ensure member@test.com is admin (currently owner) for Nova BC
  const memberUser = await ensureUser('member@test.com', 'Regular Member')
  await ensureMembership(nova.id, memberUser.id, 'owner')

  // ---------- Smashers PJ ----------
  console.log('\n--- Smashers PJ ---')
  const smashers = await getClubByName('Smashers PJ')
  if (!smashers) { console.log('  Smashers PJ not found, skipping'); return }

  // Add admin@test.com as admin to Smashers PJ (so admin can manage it)
  await ensureMembership(smashers.id, adminUser.id, 'admin')
  console.log('  Added admin@test.com as admin')

  // Also add member@test.com as member to Smashers PJ
  await ensureMembership(smashers.id, memberUser.id, 'member')
  console.log('  Added member@test.com as member')

  // Summary
  console.log('\n=== Summary ===')
  for (const [name, club] of [['PV BC', pvbc], ['Nova BC', nova], ['Smashers PJ', smashers]]) {
    const { count } = await supabase
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', club.id)
      .eq('status', 'active')
    console.log(`  ${name}: ${count} active members`)
  }

  console.log('\n=== Done ===')
  console.log('\nKey logins:')
  console.log('  admin@test.com / Test123! - Owner of PV BC, Admin of Nova BC, Admin of Smashers PJ')
  console.log('  member@test.com / Test123! - Member of PV BC, Owner of Nova BC, Member of Smashers PJ')
  console.log('  faiz@test.com / Test123! - Owner of Smashers PJ')
  console.log('  pv1@test.com - pv10@test.com / Test123! - Members of PV BC')
  console.log('  nova1@test.com - nova10@test.com / Test123! - Members of Nova BC')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
