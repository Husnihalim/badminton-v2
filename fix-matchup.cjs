const { createClient } = require('@supabase/supabase-js')
const { readFileSync } = require('fs')

const env = readFileSync('/Users/abc/Documents/Badminton v2/.env', 'utf8')
const url = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim()
const key = env.match(/SUPABASE_SERVICE_KEY=(.+)/)[1].trim()
const supabase = createClient(url, key)

;(async () => {
  const matchupId = 'db36f957-38ba-4e88-bf27-5a0b80890f6f'
  const newParticipantBId = '7ac27d76-7f3f-4105-8bb7-3d286130b781' // Tan PJ / Jia (Smashers PJ rank 4)

  const { error } = await supabase
    .from('competition_matchups')
    .update({ participant_b_id: newParticipantBId })
    .eq('id', matchupId)

  if (error) console.log('Error:', error.message)
  else console.log('Matchup #24 updated - replaced Faiz / Club Admin with Tan PJ / Jia')
})()
