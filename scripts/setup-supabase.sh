#!/bin/bash

# KelabSukan Supabase Setup Script
# This script helps you configure Supabase credentials

set -e

echo "=================================="
echo "KelabSukan Supabase Setup"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

echo "Step 1: Supabase Project Setup"
echo "-------------------------------"
echo "If you haven't created a Supabase project yet:"
echo "1. Go to https://supabase.com"
echo "2. Sign up / Log in"
echo "3. Click 'New Project'"
echo "4. Name it 'kelabsukan'"
echo "5. Choose a region close to you"
echo ""
read -p "Press Enter when you have your Supabase project ready..."
echo ""

echo "Step 2: Enter Your Supabase Credentials"
echo "----------------------------------------"
echo "Find these in your Supabase project:"
echo "Project Settings → API"
echo ""

read -p "Enter your Supabase Project URL (e.g., https://xxxxx.supabase.co): " SUPABASE_URL
read -p "Enter your Supabase Anon Key: " SUPABASE_ANON_KEY

echo ""
echo "Step 3: Configure Environment Variables"
echo "----------------------------------------"

# Create local .env file
echo "Creating local .env file..."
cat > .env << EOF
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
EOF

echo -e "${GREEN}✓ Local .env file created${NC}"

# Configure Netlify environment variables
echo ""
echo "Configuring Netlify environment variables..."

netlify env:set VITE_SUPABASE_URL "$SUPABASE_URL" 2>/dev/null || {
    echo -e "${YELLOW}⚠ Could not set Netlify env var automatically${NC}"
    echo "Please set manually at:"
    echo "https://app.netlify.com/sites/kelabsukan/settings/deploys#environment-variables"
}

netlify env:set VITE_SUPABASE_ANON_KEY "$SUPABASE_ANON_KEY" 2>/dev/null || {
    echo -e "${YELLOW}⚠ Could not set Netlify env var automatically${NC}"
}

echo -e "${GREEN}✓ Netlify environment variables configured${NC}"

echo ""
echo "Step 4: Database Setup"
echo "----------------------"
echo "You need to run the SQL migration in Supabase:"
echo ""
echo "1. Go to: $SUPABASE_URL/project/sql"
echo "2. Click 'New query'"
echo "3. Open this file in your editor:"
echo "   supabase/migrations/001_initial_schema.sql"
echo "4. Copy the entire contents"
echo "5. Paste into the SQL Editor"
echo "6. Click 'Run'"
echo ""
read -p "Press Enter when you've run the SQL migration..."

echo ""
echo "Step 5: Deploy to Netlify"
echo "-------------------------"
read -p "Trigger a new deploy? (y/n): " DEPLOY

if [ "$DEPLOY" = "y" ] || [ "$DEPLOY" = "Y" ]; then
    echo "Triggering Netlify deploy..."
    netlify deploy --prod --build
    echo -e "${GREEN}✓ Deployed to Netlify${NC}"
else
    echo "Skipping deploy. You can deploy manually with:"
    echo "  git push origin main"
    echo "Or trigger from Netlify dashboard"
fi

echo ""
echo "=================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=================================="
echo ""
echo "Your site: https://kelabsukan.netlify.app"
echo ""
echo "Test the following:"
echo "1. Register a new account"
echo "2. Create a club"
echo "3. Record a match score"
echo "4. Refresh the page - data should persist!"
echo ""
echo "If you encounter issues:"
echo "- Check browser console (F12) for errors"
echo "- Verify env vars in Netlify: https://app.netlify.com/sites/kelabsukan/settings/deploys#environment-variables"
echo "- Re-run the SQL migration if needed"
echo ""
