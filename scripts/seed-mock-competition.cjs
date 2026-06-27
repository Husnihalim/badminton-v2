#!/usr/bin/env node

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

const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test123!'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Define LEP BC users (Club 1)
const lepUsers = [
  { email: 'mohdhusni@gmail.com', name: 'Mohd Husni', role: 'superadmin' },
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

// Define Smashers PJ users (Club 2)
const smashersUsers = [
  { email: 'faiz@test.com', name: 'Faiz', role: 'admin' },
  { email: 'aaron@test.com', name: 'Aaron', role: 'member' },
  { email: 'soh@test.com', name: 'Soh', role: 'member' },
  { email: 'yew@test.com', name: 'Yew', role: 'member' },
  { email: 'jia@test.com', name: 'Jia', role: 'member' },
  { email: 'wei@test.com', name: 'Wei', role: 'member' },
  { email: 'low@test.com', name: 'Low', role: 'member' },
  { email: 'tanpj@test.com', name: 'Tan PJ', role: 'member' },
  { email: 'lim@test.com', name: 'Lim', role: 'member' },
  { email: 'ng@test.com', name: 'Ng', role: 'member' },
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

async function ensureUser(u) {
  const existing = await getUserByEmail(u.email)
  if (existing) {
    await ensureProfile(existing.id, u)
    return existing
  }

  console.log(`Creating user: ${u.email}...`)
  const { data, error } = await supabase.auth.admin.createUser({
    email: u.email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: {
      name: u.name,
      role: u.role,
    },
  })

  if (error) throw error
  await ensureProfile(data.user.id, u)
  return data.user
}

async function ensureProfile(userId, u) {
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        email: u.email,
        name: u.name,
        role: u.role,
      },
      { onConflict: 'id' }
    )

  if (error) throw error
}

async function ensureClub(name, ownerId, code) {
  const { data: existing, error: selectError } = await supabase
    .from('clubs')
    .select('*')
    .eq('name', name)
    .maybeSingle()

  if (selectError) throw selectError

  const clubData = {
    name,
    description: `${name} seed club for testing friendly and tournament modes.`,
    location: name === 'LEP BC' ? 'LEP Badminton Court' : 'PJ Badminton Hall',
    city: 'Kuala Lumpur',
    sport_focus: ['badminton'],
    open_join: true,
    approval_required: false,
    invite_code: code,
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
  const { data: existing, error: selectError } = await supabase
    .from('memberships')
    .select('*')
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .maybeSingle()

  if (selectError) throw selectError

  if (existing) {
    return existing
  }

  const { data, error } = await supabase
    .from('memberships')
    .insert({
      club_id: clubId,
      user_id: userId,
      role,
      status: 'active',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function main() {
  console.log('=== KelabSukan Seeding Completed Competition ===')
  
  // 1. Clean up old competition with code LEPSMASH
  const { data: oldComp } = await supabase
    .from('competitions')
    .select('id')
    .eq('invite_code', 'LEPSMASH')
    .maybeSingle()

  if (oldComp) {
    console.log(`Cleaning up old competition ID ${oldComp.id}...`)
    // Delete matches linked to this tournament
    await supabase.from('matches').delete().eq('tournament_id', oldComp.id)
    // Delete the competition itself
    await supabase.from('competitions').delete().eq('id', oldComp.id)
  }

  // 2. Ensure Users & Profiles exist
  console.log('Ensuring LEP BC users exist...')
  const lepAuthUsers = []
  for (const u of lepUsers) {
    const au = await ensureUser(u)
    lepAuthUsers.push({ ...u, id: au.id })
  }

  console.log('Ensuring Smashers PJ users exist...')
  const smashersAuthUsers = []
  for (const u of smashersUsers) {
    const au = await ensureUser(u)
    smashersAuthUsers.push({ ...u, id: au.id })
  }

  // 3. Ensure Clubs exist
  console.log('Ensuring clubs exist...')
  const clubLep = await ensureClub('LEP BC', lepAuthUsers[0].id, 'LEPBC2026')
  const clubSmashers = await ensureClub('Smashers PJ', smashersAuthUsers[0].id, 'SMASHERS2026')

  // 4. Ensure memberships exist
  console.log('Ensuring memberships exist...')
  for (const u of lepAuthUsers) {
    await ensureMembership(clubLep.id, u.id, u.role === 'superadmin' ? 'owner' : 'member')
  }
  for (const u of smashersAuthUsers) {
    await ensureMembership(clubSmashers.id, u.id, u.role === 'admin' ? 'admin' : 'member')
  }

  // 5. Create Competition
  console.log('Creating competition...')
  const { data: comp, error: compError } = await supabase
    .from('competitions')
    .insert({
      club_id: clubLep.id,
      title: 'LEP BC vs Smashers PJ Challenge',
      sport: 'badminton',
      format: 'friendly',
      status: 'completed',
      pairs_count: 5,
      winning_club_id: clubLep.id,
      created_by: lepAuthUsers[0].id,
      invite_code: 'LEPSMASH',
    })
    .select()
    .single()

  if (compError) throw compError
  console.log(`Competition created: ${comp.title} (ID: ${comp.id})`)

  // 5b. Create competition_clubs entries
  console.log('Creating competition clubs entries...')
  const { data: compClubLep, error: cclError } = await supabase
    .from('competition_clubs')
    .insert({
      competition_id: comp.id,
      club_id: clubLep.id,
      status: 'confirmed',
    })
    .select()
    .single()
  if (cclError) throw cclError

  const { data: compClubSmashers, error: ccsError } = await supabase
    .from('competition_clubs')
    .insert({
      competition_id: comp.id,
      club_id: clubSmashers.id,
      status: 'confirmed',
    })
    .select()
    .single()
  if (ccsError) throw ccsError

  // 6. Register Participants (Pairs)
  console.log('Registering participants...')
  
  const lepPairs = [
    { name: 'Mohd Husni / Amir', u1: lepAuthUsers[0].id, u2: lepAuthUsers[1].id },
    { name: 'Tan / Keith', u1: lepAuthUsers[2].id, u2: lepAuthUsers[3].id },
    { name: 'Husni / Chen', u1: lepAuthUsers[4].id, u2: lepAuthUsers[5].id },
    { name: 'Lee / Wong', u1: lepAuthUsers[6].id, u2: lepAuthUsers[7].id },
    { name: 'Chong / Kok', u1: lepAuthUsers[8].id, u2: lepAuthUsers[9].id },
  ]

  const smashersPairs = [
    { name: 'Faiz / Aaron', u1: smashersAuthUsers[0].id, u2: smashersAuthUsers[1].id },
    { name: 'Soh / Yew', u1: smashersAuthUsers[2].id, u2: smashersAuthUsers[3].id },
    { name: 'Jia / Wei', u1: smashersAuthUsers[4].id, u2: smashersAuthUsers[5].id },
    { name: 'Low / Tan PJ', u1: smashersAuthUsers[6].id, u2: smashersAuthUsers[7].id },
    { name: 'Lim / Ng', u1: smashersAuthUsers[8].id, u2: smashersAuthUsers[9].id },
  ]

  const lepParticipants = []
  for (const pair of lepPairs) {
    const { data: part, error } = await supabase
      .from('competition_participants')
      .insert({
        competition_id: comp.id,
        club_id: clubLep.id,
        name: pair.name,
        user_1_id: pair.u1,
        user_2_id: pair.u2,
      })
      .select()
      .single()

    if (error) throw error
    lepParticipants.push(part)
  }

  const smashersParticipants = []
  for (const pair of smashersPairs) {
    const { data: part, error } = await supabase
      .from('competition_participants')
      .insert({
        competition_id: comp.id,
        club_id: clubSmashers.id,
        name: pair.name,
        user_1_id: pair.u1,
        user_2_id: pair.u2,
      })
      .select()
      .single()

    if (error) throw error
    smashersParticipants.push(part)
  }

  // 7. Create Matchups and link them to completed matches
  console.log('Creating matchups and matches...')

  const matchupConfigs = [
    {
      lepPart: lepParticipants[0],
      smashersPart: smashersParticipants[0],
      winner: 'lep',
      scores: [[21, 18], [19, 21], [21, 17]],
      title: 'Match 1: Mohd Husni / Amir vs Faiz / Aaron',
    },
    {
      lepPart: lepParticipants[1],
      smashersPart: smashersParticipants[1],
      winner: 'smashers',
      scores: [[15, 21], [16, 21]],
      title: 'Match 2: Tan / Keith vs Soh / Yew',
    },
    {
      lepPart: lepParticipants[2],
      smashersPart: smashersParticipants[2],
      winner: 'lep',
      scores: [[21, 19], [21, 15]],
      title: 'Match 3: Husni / Chen vs Jia / Wei',
    },
    {
      lepPart: lepParticipants[3],
      smashersPart: smashersParticipants[3],
      winner: 'smashers',
      scores: [[18, 21], [21, 19], [19, 21]],
      title: 'Match 4: Lee / Wong vs Low / Tan PJ',
    },
    {
      lepPart: lepParticipants[4],
      smashersPart: smashersParticipants[4],
      winner: 'lep',
      scores: [[21, 14], [21, 16]],
      title: 'Match 5: Chong / Kok vs Lim / Ng',
    },
  ]

  for (let i = 0; i < matchupConfigs.length; i++) {
    const config = matchupConfigs[i]

    // Create matchup first
    const { data: matchup, error: matchupError } = await supabase
      .from('competition_matchups')
      .insert({
        competition_id: comp.id,
        participant_a_id: config.lepPart.id,
        participant_b_id: config.smashersPart.id,
        club_a_id: compClubLep.id,
        club_b_id: compClubSmashers.id,
        winner_club_id: config.winner === 'lep' ? compClubLep.id : compClubSmashers.id,
        order_index: i + 1,
        status: 'completed',
        winner_participant_id: config.winner === 'lep' ? config.lepPart.id : config.smashersPart.id,
      })
      .select()
      .single()

    if (matchupError) throw matchupError

    // Create corresponding match record
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        club_id: clubLep.id,
        title: config.title,
        sport: 'badminton',
        match_type: 'doubles',
        recorded_by: lepAuthUsers[0].id,
        tournament_id: comp.id,
      })
      .select()
      .single()

    if (matchError) throw matchError

    // Link matchup to match_id
    await supabase
      .from('competition_matchups')
      .update({ match_id: match.id })
      .eq('id', matchup.id)

    // Add match participants
    const participantsData = [
      { match_id: match.id, user_id: config.lepPart.user_1_id, team: 1 },
      { match_id: match.id, user_id: config.lepPart.user_2_id, team: 1 },
      { match_id: match.id, user_id: config.smashersPart.user_1_id, team: 2 },
      { match_id: match.id, user_id: config.smashersPart.user_2_id, team: 2 },
    ]
    const { error: partErr } = await supabase.from('match_participants').insert(participantsData)
    if (partErr) throw partErr

    // Add score sets
    const scoreSetsData = config.scores.map((set, setIdx) => ({
      match_id: match.id,
      set_number: setIdx + 1,
      team1_score: set[0],
      team2_score: set[1],
    }))
    const { error: scoreErr } = await supabase.from('score_sets').insert(scoreSetsData)
    if (scoreErr) throw scoreErr

    console.log(`Seeded Matchup ${i + 1}: ${config.title} (Winner: ${config.winner.toUpperCase()})`)
  }

  console.log('\n✅ Successfully seeded completed competition!')
  console.log(`Competition Title: ${comp.title}`)
  console.log(`Invite Code: LEPSMASH`)
  console.log(`Competition Page Link: /competition/${comp.id}`)
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err)
  process.exit(1)
})
