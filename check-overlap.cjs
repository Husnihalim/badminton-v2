const { createClient } = require('@supabase/supabase-js')
const { readFileSync } = require('fs')

const env = readFileSync('/Users/abc/Documents/Badminton v2/.env', 'utf8')
const url = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim()
const key = env.match(/SUPABASE_SERVICE_KEY=(.+)/)[1].trim()

const supabase = createClient(url, key)

;(async () => {
  const compId = '7e1f19fd-3382-4131-8a72-c3e57d8c05eb'

  // Get all participants for this competition
  const { data: participants } = await supabase
    .from('competition_participants')
    .select('id, name, user_1_id, user_2_id, club_id, rank')
    .eq('competition_id', compId)

  console.log('=== ALL PARTICIPANTS ===')
  participants.forEach(p => {
    console.log(p.name + ' [' + p.id + '] club=' + p.club_id + ' users=' + [p.user_1_id, p.user_2_id].filter(Boolean).join(', ') + ' rank=' + p.rank)
  })

  // Check for users appearing in multiple clubs
  const userClubs = {}
  participants.forEach(p => {
    const users = [p.user_1_id, p.user_2_id].filter(Boolean)
    users.forEach(u => {
      if (!userClubs[u]) userClubs[u] = []
      if (!userClubs[u].some(c => c.club_id === p.club_id)) {
        userClubs[u].push({ club_id: p.club_id, participant: p.name })
      }
    })
  })

  console.log('\n=== USERS IN MULTIPLE CLUBS ===')
  Object.entries(userClubs).forEach(([userId, clubs]) => {
    if (clubs.length > 1) {
      console.log('User ' + userId + ' appears in clubs:')
      clubs.forEach(c => console.log('  ' + c.club_id + ' (as ' + c.participant + ')'))
    }
  })

  // Get club names
  const clubIds = [...new Set(participants.map(p => p.club_id))]
  const { data: clubs } = await supabase.from('clubs').select('id, name').in('id', clubIds)
  console.log('\n=== CLUBS ===')
  clubs.forEach(c => console.log(c.id + ' = ' + c.name))

  // Get competition_clubs
  const { data: compClubs } = await supabase.from('competition_clubs').select('*').eq('competition_id', compId)
  console.log('\n=== COMPETITION CLUBS ===')
  compClubs.forEach(cc => {
    const club = clubs.find(c => c.id === cc.club_id)
    console.log((club?.name || cc.club_id) + ' status=' + cc.status + ' lineup_confirmed=' + cc.lineup_confirmed + ' club_id=' + cc.club_id)
  })
})()
