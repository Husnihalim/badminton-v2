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
  const { data, error } = await supabase.rpc('rebuild_global_elo')

  if (error) {
    console.error('Error rebuilding global Elo:', error)
    process.exit(1)
  }

  console.log('Global Elo rebuild complete:', data)
}

main().catch(console.error)
