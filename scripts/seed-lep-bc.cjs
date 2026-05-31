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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://yjetickebgngfttlvvur.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const adminUser = {
  email: 'mohdhusni@gmail.com',
  password: 'TempPass123!',
  name: 'Mohd Husni',
  role: 'superadmin',
}

const fakeUsers = [
  { email: 'lep.member1@example.com', password: 'Test123!', name: 'Aiman Rahman', role: 'member' },
  { email: 'lep.member2@example.com', password: 'Test123!', name: 'Farah Aziz', role: 'member' },
  { email: 'lep.member3@example.com', password: 'Test123!', name: 'Jason Tan', role: 'member' },
  { email: 'lep.member4@example.com', password: 'Test123!', name: 'Mei Lin', role: 'member' },
  { email: 'lep.member5@example.com', password: 'Test123!', name: 'Kumar Raj', role: 'member' },
  { email: 'lep.pending@example.com', password: 'Test123!', name: 'Pending Member', role: 'member' },
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

  if (!matchId) {
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
  }

  await supabase.from('match_participants').delete().eq('match_id', matchId)
  await supabase.from('score_sets').delete().eq('match_id', matchId)

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
  const members = []
  for (const seedUser of fakeUsers) {
    members.push(await ensureUser(seedUser))
  }

  const club = await ensureClub(admin.id)
  await ensureMembership(club.id, admin.id, 'owner', admin.id)

  for (const member of members.slice(0, 5)) {
    await ensureMembership(club.id, member.id, 'member', admin.id)
  }

  await ensureJoinRequest(club.id, members[5].id)

  const event1 = await ensureEvent(club.id, admin.id, 'LEP BC Wednesday Session', 3, 'Court 1-2', 16)
  const event2 = await ensureEvent(club.id, admin.id, 'LEP BC Weekend Doubles', 7, 'Main Hall', 24)

  await ensureRsvp(event1.id, admin.id, 'going')
  await ensureRsvp(event1.id, members[0].id, 'going')
  await ensureRsvp(event1.id, members[1].id, 'going')
  await ensureRsvp(event1.id, members[2].id, 'maybe')
  await ensureRsvp(event2.id, members[3].id, 'going')
  await ensureRsvp(event2.id, members[4].id, 'going')

  await ensureMatch(
    club.id,
    admin.id,
    'LEP BC Singles Seed Match',
    [
      { userId: members[0].id, team: 1 },
      { userId: members[1].id, team: 2 },
    ],
    [
      [21, 18],
      [19, 21],
      [21, 15],
    ]
  )

  await ensureMatch(
    club.id,
    admin.id,
    'LEP BC Doubles Seed Match',
    [
      { userId: members[0].id, team: 1 },
      { userId: members[2].id, team: 1 },
      { userId: members[3].id, team: 2 },
      { userId: members[4].id, team: 2 },
    ],
    [
      [21, 17],
      [21, 19],
    ]
  )

  console.log('Done.')
  console.log(`Club: ${club.name}`)
  console.log(`Club ID: ${club.id}`)
  console.log(`Invite code: ${club.invite_code}`)
  console.log(`Admin/owner: ${adminUser.email}`)
  console.log('Fake user password: Test123!')
  console.log('Fake users:')
  fakeUsers.forEach((user) => console.log(`- ${user.email}`))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
