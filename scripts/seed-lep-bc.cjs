#!/usr/bin/env node

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

const password = TEST_PASSWORD || 'TempPass123!'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const adminUser = {
  email: 'mohdhusni@gmail.com',
  password: password,
  name: 'Mohd Husni',
  role: 'superadmin',
}

const fakeUsers = [
  { email: 'amir@test.com', name: 'Amir', role: 'member' },
  { email: 'tan@test.com', name: 'Tan', role: 'member' },
  { email: 'keith@test.com', name: 'Keith', role: 'member' },
  { email: 'husni@test.com', name: 'Husni', role: 'member' },
  { email: 'chen@test.com', name: 'Chen', role: 'member' },
  { email: 'lee@test.com', name: 'Lee', role: 'member' },
  { email: 'wong@test.com', name: 'Wong', role: 'member' },
  { email: 'chong@test.com', name: 'Chong', role: 'member' },
  { email: 'kok@test.com', name: 'Kok', role: 'member' },
]

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

async function ensureUser(seedUser) {
  const existing = await getUserByEmail(seedUser.email)
  if (existing) {
    await ensureProfile(existing.id, seedUser)
    return existing
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: seedUser.email,
    password: seedUser.password,
    email_confirm: true,
    user_metadata: {
      name: seedUser.name,
      role: seedUser.role,
    },
  })

  if (error) throw error
  await ensureProfile(data.user.id, seedUser)
  return data.user
}

async function ensureProfile(userId, seedUser) {
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        email: seedUser.email,
        name: seedUser.name,
        role: seedUser.role,
      },
      { onConflict: 'id' }
    )

  if (error) throw error
}

async function ensureClub(ownerId) {
  const { data: existing, error: selectError } = await supabase
    .from('clubs')
    .select('*')
    .eq('name', 'LEP BC')
    .maybeSingle()

  if (selectError) throw selectError

  const clubData = {
    name: 'LEP BC',
    description: 'Seed badminton club for testing members, scores, events, RSVPs, and join requests.',
    location: 'LEP Badminton Court',
    city: 'Kuala Lumpur',
    sport_focus: ['badminton'],
    open_join: true,
    approval_required: true,
    invite_code: 'LEPBC2026',
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

async function ensureMembership(clubId, userId, role, approvedBy = null) {
  const { data: existing, error: selectError } = await supabase
    .from('memberships')
    .select('*')
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .maybeSingle()

  if (selectError) throw selectError

  if (existing) {
    if (existing.role !== role || existing.status !== 'active') {
      console.warn(
        `Membership exists for ${userId} with role=${existing.role}, status=${existing.status}; leaving unchanged.`
      )
    }
    return existing
  }

  const { data, error } = await supabase
    .from('memberships')
    .insert({
      club_id: clubId,
      user_id: userId,
      role,
      status: 'active',
      approved_by: approvedBy,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function ensureJoinRequest(clubId, userId) {
  const { error } = await supabase
    .from('join_requests')
    .upsert(
      {
        club_id: clubId,
        user_id: userId,
        status: 'pending',
      },
      { onConflict: 'club_id,user_id' }
    )

  if (error) throw error
}

async function ensureEvent(clubId, createdBy, title, daysFromNow, location, maxParticipants) {
  const eventDate = new Date()
  eventDate.setDate(eventDate.getDate() + daysFromNow)
  eventDate.setHours(20, 0, 0, 0)

  const { data: existing, error: selectError } = await supabase
    .from('events')
    .select('*')
    .eq('club_id', clubId)
    .eq('title', title)
    .maybeSingle()

  if (selectError) throw selectError

  const eventData = {
    club_id: clubId,
    title,
    event_date: eventDate.toISOString(),
    location,
    max_participants: maxParticipants,
    signup_open: true,
    created_by: createdBy,
  }

  if (existing) {
    const { data, error } = await supabase
      .from('events')
      .update(eventData)
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('events')
    .insert(eventData)
    .select()
    .single()

  if (error) throw error
  return data
}

async function ensureRsvp(eventId, userId, status) {
  const { error } = await supabase
    .from('event_rsvps')
    .upsert(
      {
        event_id: eventId,
        user_id: userId,
        status,
      },
      { onConflict: 'event_id,user_id' }
    )

  if (error) throw error
}

async function ensureMatch(clubId, recordedBy, title, participants, scoreSets) {
  const { data: existingMatches, error: selectError } = await supabase
    .from('matches')
    .select('id')
    .eq('club_id', clubId)
    .eq('title', title)
    .limit(1)

  if (selectError) throw selectError

  let matchId = existingMatches?.[0]?.id

  if (matchId) {
    // Match already exists, skip to avoid destructive re-insert
    return matchId
  }

  const { data, error } = await supabase
    .from('matches')
    .insert({
      club_id: clubId,
      title,
      sport: 'badminton',
      match_type: participants.length === 4 ? 'doubles' : 'singles',
      recorded_by: recordedBy,
      match_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (error) throw error
  matchId = data.id

  const { error: participantsError } = await supabase
    .from('match_participants')
    .insert(
      participants.map((participant) => ({
        match_id: matchId,
        user_id: participant.userId,
        team: participant.team,
        is_guest: false,
        guest_name: null,
      }))
    )

  if (participantsError) throw participantsError

  const { error: scoresError } = await supabase
    .from('score_sets')
    .insert(
      scoreSets.map((scoreSet, index) => ({
        match_id: matchId,
        set_number: index + 1,
        team1_score: scoreSet[0],
        team2_score: scoreSet[1],
      }))
    )

  if (scoresError) throw scoresError
  return matchId
}

async function main() {
  console.log('Seeding LEP BC...')

  const admin = await ensureUser(adminUser)
  const club = await ensureClub(admin.id)
  await ensureMembership(club.id, admin.id, 'owner', admin.id)

  // Create fake users, profiles, and memberships
  console.log('Creating fake users...')
  const createdUsers = []
  for (const u of fakeUsers) {
    const user = await ensureUser(u)
    createdUsers.push({ ...u, id: user.id })
    await ensureMembership(club.id, user.id, 'member', admin.id)
    console.log(`  Created user: ${u.email} (${u.name})`)
  }

  // Create past events
  console.log('Creating sample events...')
  const now = new Date()
  const pastEvents = [
    { title: 'Monday Night Games', daysFromNow: -14, location: 'LEP Court 1', max: 20 },
    { title: 'Wednesday Doubles', daysFromNow: -10, location: 'LEP Court 2', max: 16 },
    { title: 'Friday Social', daysFromNow: -7, location: 'LEP Main Hall', max: 24 },
    { title: 'Weekend Tournament Prep', daysFromNow: -3, location: 'LEP Court 1', max: 20 },
  ]
  const events = []
  for (const evt of pastEvents) {
    const event = await ensureEvent(club.id, admin.id, evt.title, evt.daysFromNow, evt.location, evt.max)
    events.push(event)
    console.log(`  Event: ${evt.title}`)

    // Add some RSVPs
    for (const u of createdUsers.slice(0, 6)) {
      await ensureRsvp(event.id, u.id, Math.random() > 0.3 ? 'going' : 'not_going')
    }
    await ensureRsvp(event.id, admin.id, 'going')
  }

  // Create sample matches with scores
  console.log('Creating sample matches...')
  const matchConfigs = [
    {
      title: 'Amir vs Tan',
      participants: [
        { userId: createdUsers[0].id, team: 1 },
        { userId: createdUsers[1].id, team: 2 },
      ],
      scores: [[21, 15], [21, 18]],
    },
    {
      title: 'Keith vs Husni',
      participants: [
        { userId: createdUsers[2].id, team: 1 },
        { userId: createdUsers[3].id, team: 2 },
      ],
      scores: [[18, 21], [21, 17], [21, 14]],
    },
    {
      title: 'Chen vs Lee',
      participants: [
        { userId: createdUsers[4].id, team: 1 },
        { userId: createdUsers[5].id, team: 2 },
      ],
      scores: [[21, 19], [19, 21], [21, 16]],
    },
    {
      title: 'Wong & Chong vs Kok & Admin',
      participants: [
        { userId: createdUsers[6].id, team: 1 },
        { userId: createdUsers[7].id, team: 1 },
        { userId: createdUsers[8].id, team: 2 },
        { userId: admin.id, team: 2 },
      ],
      scores: [[21, 17], [21, 15]],
    },
  ]

  for (const config of matchConfigs) {
    const matchId = await ensureMatch(club.id, admin.id, config.title, config.participants, config.scores)
    console.log(`  Match: ${config.title} (${matchId})`)
  }

  console.log('\nDone.')
  console.log(`Club: ${club.name}`)
  console.log(`Club ID: ${club.id}`)
  console.log(`Invite code: ${club.invite_code}`)
  console.log(`Admin/owner: ${adminUser.email}`)
  console.log(`Fake users created: ${createdUsers.length}`)
  console.log(`Events created: ${events.length}`)
  console.log(`Matches created: ${matchConfigs.length}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
