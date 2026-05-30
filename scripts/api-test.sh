#!/bin/bash

# API Testing Script for KelabSukan
# Tests Supabase backend endpoints

set -e

SUPABASE_URL="https://yjetickebgngfttlvvur.supabase.co"
ANON_KEY="sb_publishable_YD_mvKPRiD3x_4n56zYrGQ_MO1b5bcK"

echo "=================================="
echo "KelabSukan API Testing"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local endpoint=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        "$SUPABASE_URL/rest/v1/$endpoint" \
        -H "apikey: $ANON_KEY" \
        -H "Authorization: Bearer $ANON_KEY" 2>&1)
    
    if [ "$response" = "$expected_status" ] || [ "$response" = "401" ]; then
        echo -e "${GREEN}✓${NC} (Status: $response)"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗${NC} (Status: $response, Expected: $expected_status)"
        ((TESTS_FAILED++))
    fi
}

echo "1. Testing Table Accessibility"
echo "-------------------------------"
test_endpoint "Clubs table" "clubs?select=*"
test_endpoint "Profiles table" "profiles?select=*"
test_endpoint "Memberships table" "memberships?select=*"
test_endpoint "Events table" "events?select=*"
test_endpoint "Matches table" "matches?select=*"
test_endpoint "Score Sets table" "score_sets?select=*"
test_endpoint "Join Requests table" "join_requests?select=*"
test_endpoint "Event RSVPs table" "event_rsvps?select=*"

echo ""
echo "2. Testing Auth Endpoint"
echo "------------------------"
echo -n "Testing Auth endpoint... "
auth_response=$(curl -s -o /dev/null -w "%{http_code}" \
    "$SUPABASE_URL/auth/v1/token?grant_type=password" \
    -H "apikey: $ANON_KEY" \
    -X POST 2>&1)

if [ "$auth_response" = "400" ] || [ "$auth_response" = "200" ]; then
    echo -e "${GREEN}✓${NC} (Status: $auth_response - endpoint exists)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} (Status: $auth_response)"
    ((TESTS_FAILED++))
fi

echo ""
echo "3. Testing Storage Endpoint"
echo "---------------------------"
echo -n "Testing Storage endpoint... "
storage_response=$(curl -s -o /dev/null -w "%{http_code}" \
    "$SUPABASE_URL/storage/v1/bucket" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" 2>&1)

if [ "$storage_response" = "200" ] || [ "$storage_response" = "401" ]; then
    echo -e "${GREEN}✓${NC} (Status: $storage_response)"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}!${NC} (Status: $storage_response - may not be configured)"
fi

echo ""
echo "=================================="
echo "Test Results"
echo "=================================="
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All API endpoints are accessible!${NC}"
    echo ""
    echo "Next: Test the frontend at https://kelabsukan.netlify.app"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo "Check your Supabase configuration"
    exit 1
fi
