#!/usr/bin/env node
// Backfill global Elo for all existing matches with scores
// Run: node scripts/backfill-global-elo.cjs

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
const fs = require('fs')

// Read credentials from .env
const envPath = path.join(__dirname, '..', '.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim()
const serviceKey = envContent.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim()

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase credentials in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function main() {
  // Get all matches that need Elo processing (in chronological order)
  const { data: matches, error } = await supabase
    .from('matches')
    .select('id, match_type, created_at')
    .eq('elo_processed', false)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching matches:', error)
    process.exit(1)
  }

  console.log(`Found ${matches.length} matches to process`)

  let processed = 0
  let errors = 0

  for (const match of matches) {
    try {
      const { error: rpcError } = await supabase.rpc('recalculate_match_elo', {
        p_match_id: match.id
      })

      if (rpcError) {
        console.error(`Error processing match ${match.id} (${match.match_type}):`, rpcError.message)
        errors++
      } else {
        processed++
        if (processed % 10 === 0 || processed === matches.length) {
          console.log(`Progress: ${processed}/${matches.length}`)
        }
      }
    } catch (err) {
      console.error(`Unexpected error for match ${match.id}:`, err.message)
      errors++
    }
  }

  console.log(`\nBackfill complete: ${processed} processed, ${errors} errors`)
}

main().catch(console.error)
