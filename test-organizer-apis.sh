#!/bin/bash

# Organizer APIs Test Script
# Tests all Organizer endpoints: Profile, Events, Ticket Types, Bookings, Tickets, Analytics

set +e

BASE_URL="${BASE_URL:-http://localhost:3001/api}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Organizer APIs Test Script"
echo "=========================================="
echo ""

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to print test results
print_test() {
    local test_name=$1
    local status=$2
    local message=$3
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} $test_name"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗${NC} $test_name: $message"
        ((TESTS_FAILED++))
    fi
}

# Helper function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=$4
    
    if [ -n "$token" ]; then
        if [ -n "$data" ]; then
            curl -s --max-time 10 -X "$method" "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $token" \
                -d "$data"
        else
            curl -s --max-time 10 -X "$method" "$BASE_URL$endpoint" \
                -H "Authorization: Bearer $token"
        fi
    else
        if [ -n "$data" ]; then
            curl -s --max-time 10 -X "$method" "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data"
        else
            curl -s --max-time 10 -X "$method" "$BASE_URL$endpoint"
        fi
    fi
}

# Extract ID from response
extract_id() {
    local response=$1
    if command -v jq &> /dev/null; then
        echo "$response" | jq -r '.id // empty' 2>/dev/null
    else
        echo "$response" | sed -E 's/.*"id"\s*:\s*"([^"]+)".*/\1/' | head -1 | tr -d '\n\r' | xargs
    fi
}

echo "Step 1: Register and authenticate as organizer..."
REGISTER_RESPONSE=$(api_call POST /auth/register '{
    "name": "Test Organizer",
    "email": "organizer-test-'$(date +%s)'@example.com",
    "password": "TestPass123!"
}')

if echo "$REGISTER_RESPONSE" | grep -q "accessToken"; then
    ORG_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    ORG_ID=$(extract_id "$REGISTER_RESPONSE")
    echo -e "${GREEN}✓${NC} Organizer registered: $ORG_ID"
    echo ""
else
    echo -e "${RED}✗${NC} Failed to register organizer"
    echo "Response: $REGISTER_RESPONSE"
    exit 1
fi

# Upgrade to ORGANIZER role
UPGRADE_SCRIPT="const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.user.update({ where: { id: '$ORG_ID' }, data: { role: 'ORGANIZER', emailVerified: true } }).then(() => { console.log('SUCCESS'); process.exit(0); }).catch((e) => { console.error('ERROR:', e.message); process.exit(1); });"
UPGRADE_OUTPUT=$(node -e "$UPGRADE_SCRIPT" 2>&1)
if echo "$UPGRADE_OUTPUT" | grep -q "SUCCESS"; then
    echo -e "${GREEN}✓${NC} User upgraded to ORGANIZER role"
    echo ""
else
    echo -e "${YELLOW}⚠${NC} Could not upgrade user automatically. Some tests may fail."
    echo ""
fi

# Step 2: Get categories and cities for event creation
echo "Step 2: Get categories and cities for event creation..."
CATEGORIES_RESPONSE=$(api_call GET "/categories" "" "")
CITIES_RESPONSE=$(api_call GET "/cities" "" "")

if command -v jq &> /dev/null; then
    CATEGORY_ID=$(echo "$CATEGORIES_RESPONSE" | jq -r '.categories[0].id // empty' 2>/dev/null)
    CITY_ID=$(echo "$CITIES_RESPONSE" | jq -r '.cities[0].id // empty' 2>/dev/null)
else
    CATEGORY_ID=$(echo "$CATEGORIES_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4 | tr -d '\n\r')
    CITY_ID=$(echo "$CITIES_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4 | tr -d '\n\r')
fi

# If no categories/cities exist, create them via admin (assuming admin exists)
if [ -z "$CATEGORY_ID" ] || [ -z "$CITY_ID" ]; then
    echo -e "${YELLOW}⚠${NC} No categories or cities found. Please create them via admin APIs first."
    echo "Creating test category and city..."
    
    # Try to create via admin (this will fail if not admin, but that's ok)
    CREATE_CAT_RESPONSE=$(api_call POST "/admin/categories" '{
        "name": "Test Category Organizer",
        "description": "Test category"
    }' "$ORG_TOKEN")
    
    CREATE_CITY_RESPONSE=$(api_call POST "/admin/cities" '{
        "name": "Test City Organizer",
        "state": "TX",
        "country": "USA"
    }' "$ORG_TOKEN")
    
    # Try to get them again
    CATEGORIES_RESPONSE=$(api_call GET "/categories" "" "")
    CITIES_RESPONSE=$(api_call GET "/cities" "" "")
    
    if command -v jq &> /dev/null; then
        CATEGORY_ID=$(echo "$CATEGORIES_RESPONSE" | jq -r '.categories[0].id // empty' 2>/dev/null)
        CITY_ID=$(echo "$CITIES_RESPONSE" | jq -r '.cities[0].id // empty' 2>/dev/null)
    else
        CATEGORY_ID=$(echo "$CATEGORIES_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4 | tr -d '\n\r')
        CITY_ID=$(echo "$CITIES_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4 | tr -d '\n\r')
    fi
fi

if [ -n "$CATEGORY_ID" ] && [ -n "$CITY_ID" ]; then
    echo -e "${GREEN}✓${NC} Category ID: $CATEGORY_ID, City ID: $CITY_ID"
    echo ""
else
    echo -e "${RED}✗${NC} Failed to get category or city IDs. Some tests will be skipped."
    echo ""
fi

echo "=========================================="
echo "TEST 1: Organizer Profile"
echo "=========================================="

# Test 1.1: Update organizer profile
UPDATE_PROFILE_RESPONSE=$(api_call PATCH "/organizer/profile" '{
    "companyName": "Test Events Co",
    "description": "We organize amazing events",
    "website": "https://testevents.com"
}' "$ORG_TOKEN")

if echo "$UPDATE_PROFILE_RESPONSE" | grep -q '"companyName"'; then
    print_test "Test 1.1: PATCH /organizer/profile" "PASS"
else
    print_test "Test 1.1: PATCH /organizer/profile" "FAIL" "Response: $UPDATE_PROFILE_RESPONSE"
fi

# Test 1.2: Get public organizer profile
GET_PUBLIC_RESPONSE=$(api_call GET "/organizer/$ORG_ID/public" "" "")
if echo "$GET_PUBLIC_RESPONSE" | grep -q '"id"'; then
    print_test "Test 1.2: GET /organizer/:id/public" "PASS"
else
    print_test "Test 1.2: GET /organizer/:id/public" "FAIL" "Response: $GET_PUBLIC_RESPONSE"
fi

echo ""

echo "=========================================="
echo "TEST 2: Event Management"
echo "=========================================="

# Test 2.1: Create event
if [ -n "$CATEGORY_ID" ] && [ -n "$CITY_ID" ]; then
    CREATE_EVENT_RESPONSE=$(api_call POST /events '{
        "title": "Test Event Organizer",
        "description": "Test event for organizer APIs",
        "categoryId": "'"$CATEGORY_ID"'",
        "cityId": "'"$CITY_ID"'",
        "date": "'$(date -u -v+30d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d "+30 days" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)'",
        "time": "18:00",
        "venue": "Test Venue",
        "address": "123 Test Street",
        "ticketTypes": [
            {
                "name": "General Admission",
                "price": 50.00,
                "total": 100,
                "description": "Standard ticket"
            }
        ]
    }' "$ORG_TOKEN")

    if echo "$CREATE_EVENT_RESPONSE" | grep -q '"id"'; then
        EVENT_ID=$(extract_id "$CREATE_EVENT_RESPONSE")
        print_test "Test 2.1: POST /events" "PASS"
    else
        print_test "Test 2.1: POST /events" "FAIL" "Response: $CREATE_EVENT_RESPONSE"
        EVENT_ID=""
    fi
else
    print_test "Test 2.1: POST /events" "FAIL" "Missing category or city ID"
    EVENT_ID=""
fi

# Test 2.2: Get own events
GET_EVENTS_RESPONSE=$(api_call GET "/events?organizerId=$ORG_ID" "" "$ORG_TOKEN")
if echo "$GET_EVENTS_RESPONSE" | grep -q '"data"'; then
    print_test "Test 2.2: GET /events (own events)" "PASS"
else
    print_test "Test 2.2: GET /events (own events)" "FAIL" "Response: $GET_EVENTS_RESPONSE"
fi

# Test 2.3: Update event
if [ -n "$EVENT_ID" ]; then
    UPDATE_EVENT_RESPONSE=$(api_call PUT "/events/$EVENT_ID" '{
        "title": "Updated Test Event",
        "description": "Updated description"
    }' "$ORG_TOKEN")
    if echo "$UPDATE_EVENT_RESPONSE" | grep -q '"id"'; then
        print_test "Test 2.3: PUT /events/:id" "PASS"
    else
        print_test "Test 2.3: PUT /events/:id" "FAIL" "Response: $UPDATE_EVENT_RESPONSE"
    fi
else
    print_test "Test 2.3: PUT /events/:id" "FAIL" "No event ID"
fi

# Test 2.4: Publish event
if [ -n "$EVENT_ID" ]; then
    PUBLISH_RESPONSE=$(api_call PATCH "/events/$EVENT_ID/publish" "" "$ORG_TOKEN")
    if echo "$PUBLISH_RESPONSE" | grep -q '"status"'; then
        print_test "Test 2.4: PATCH /events/:id/publish" "PASS"
    else
        print_test "Test 2.4: PATCH /events/:id/publish" "FAIL" "Response: $PUBLISH_RESPONSE"
    fi
else
    print_test "Test 2.4: PATCH /events/:id/publish" "FAIL" "No event ID"
fi

# Test 2.5: Unpublish event
if [ -n "$EVENT_ID" ]; then
    UNPUBLISH_RESPONSE=$(api_call PATCH "/events/$EVENT_ID/unpublish" "" "$ORG_TOKEN")
    if echo "$UNPUBLISH_RESPONSE" | grep -q '"status"'; then
        print_test "Test 2.5: PATCH /events/:id/unpublish" "PASS"
    else
        print_test "Test 2.5: PATCH /events/:id/unpublish" "FAIL" "Response: $UNPUBLISH_RESPONSE"
    fi
else
    print_test "Test 2.5: PATCH /events/:id/unpublish" "FAIL" "No event ID"
fi

# Test 2.6: Get event analytics
if [ -n "$EVENT_ID" ]; then
    ANALYTICS_RESPONSE=$(api_call GET "/events/$EVENT_ID/analytics" "" "$ORG_TOKEN")
    if echo "$ANALYTICS_RESPONSE" | grep -q '"summary"'; then
        print_test "Test 2.6: GET /events/:id/analytics" "PASS"
    else
        print_test "Test 2.6: GET /events/:id/analytics" "FAIL" "Response: $ANALYTICS_RESPONSE"
    fi
else
    print_test "Test 2.6: GET /events/:id/analytics" "FAIL" "No event ID"
fi

# Test 2.7: Duplicate event
if [ -n "$EVENT_ID" ]; then
    DUPLICATE_RESPONSE=$(api_call POST "/events/$EVENT_ID/duplicate" "" "$ORG_TOKEN")
    if echo "$DUPLICATE_RESPONSE" | grep -q '"id"'; then
        print_test "Test 2.7: POST /events/:id/duplicate" "PASS"
    else
        print_test "Test 2.7: POST /events/:id/duplicate" "FAIL" "Response: $DUPLICATE_RESPONSE"
    fi
else
    print_test "Test 2.7: POST /events/:id/duplicate" "FAIL" "No event ID"
fi

# Test 2.8: Toggle featured status
if [ -n "$EVENT_ID" ]; then
    FEATURE_RESPONSE=$(api_call PATCH "/events/$EVENT_ID/feature" "" "$ORG_TOKEN")
    if echo "$FEATURE_RESPONSE" | grep -q '"featured"'; then
        print_test "Test 2.8: PATCH /events/:id/feature" "PASS"
    else
        print_test "Test 2.8: PATCH /events/:id/feature" "FAIL" "Response: $FEATURE_RESPONSE"
    fi
else
    print_test "Test 2.8: PATCH /events/:id/feature" "FAIL" "No event ID"
fi

echo ""

echo "=========================================="
echo "TEST 3: Ticket Type Management"
echo "=========================================="

# Test 3.1: Create ticket type
if [ -n "$EVENT_ID" ]; then
    CREATE_TT_RESPONSE=$(api_call POST "/events/$EVENT_ID/ticket-types" '{
        "name": "VIP Ticket",
        "price": 100.00,
        "total": 50,
        "description": "VIP access"
    }' "$ORG_TOKEN")

    if echo "$CREATE_TT_RESPONSE" | grep -q '"id"'; then
        TICKET_TYPE_ID=$(extract_id "$CREATE_TT_RESPONSE")
        print_test "Test 3.1: POST /events/:id/ticket-types" "PASS"
    else
        print_test "Test 3.1: POST /events/:id/ticket-types" "FAIL" "Response: $CREATE_TT_RESPONSE"
        TICKET_TYPE_ID=""
    fi
else
    print_test "Test 3.1: POST /events/:id/ticket-types" "FAIL" "No event ID"
    TICKET_TYPE_ID=""
fi

# Test 3.2: Get ticket types
if [ -n "$EVENT_ID" ]; then
    GET_TT_RESPONSE=$(api_call GET "/events/$EVENT_ID/ticket-types" "" "$ORG_TOKEN")
    if echo "$GET_TT_RESPONSE" | grep -q '"id"'; then
        print_test "Test 3.2: GET /events/:id/ticket-types" "PASS"
    else
        print_test "Test 3.2: GET /events/:id/ticket-types" "FAIL" "Response: $GET_TT_RESPONSE"
    fi
else
    print_test "Test 3.2: GET /events/:id/ticket-types" "FAIL" "No event ID"
fi

# Test 3.3: Update ticket type
if [ -n "$EVENT_ID" ] && [ -n "$TICKET_TYPE_ID" ]; then
    UPDATE_TT_RESPONSE=$(api_call PATCH "/events/$EVENT_ID/ticket-types/$TICKET_TYPE_ID" '{
        "price": 120.00
    }' "$ORG_TOKEN")
    if echo "$UPDATE_TT_RESPONSE" | grep -q '"id"'; then
        print_test "Test 3.3: PATCH /events/:id/ticket-types/:ticketTypeId" "PASS"
    else
        print_test "Test 3.3: PATCH /events/:id/ticket-types/:ticketTypeId" "FAIL" "Response: $UPDATE_TT_RESPONSE"
    fi
else
    print_test "Test 3.3: PATCH /events/:id/ticket-types/:ticketTypeId" "FAIL" "No event or ticket type ID"
fi

# Test 3.4: Delete ticket type
if [ -n "$EVENT_ID" ] && [ -n "$TICKET_TYPE_ID" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X DELETE "$BASE_URL/events/$EVENT_ID/ticket-types/$TICKET_TYPE_ID" \
        -H "Authorization: Bearer $ORG_TOKEN")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
        print_test "Test 3.4: DELETE /events/:id/ticket-types/:ticketTypeId" "PASS"
    else
        print_test "Test 3.4: DELETE /events/:id/ticket-types/:ticketTypeId" "FAIL" "HTTP Code: $HTTP_CODE"
    fi
else
    print_test "Test 3.4: DELETE /events/:id/ticket-types/:ticketTypeId" "FAIL" "No event or ticket type ID"
fi

echo ""

echo "=========================================="
echo "TEST 4: Booking Management"
echo "=========================================="

# Test 4.1: Get event bookings
if [ -n "$EVENT_ID" ]; then
    GET_BOOKINGS_RESPONSE=$(api_call GET "/bookings/event/$EVENT_ID" "" "$ORG_TOKEN")
    if echo "$GET_BOOKINGS_RESPONSE" | grep -q '"data"'; then
        print_test "Test 4.1: GET /bookings/event/:eventId" "PASS"
    else
        print_test "Test 4.1: GET /bookings/event/:eventId" "FAIL" "Response: $GET_BOOKINGS_RESPONSE"
    fi
else
    print_test "Test 4.1: GET /bookings/event/:eventId" "FAIL" "No event ID"
fi

# Test 4.2: Update booking status (requires a booking ID - placeholder)
echo -e "${YELLOW}⊘${NC} Test 4.2: PATCH /bookings/:id/status (PLACEHOLDER - requires booking ID)"
echo "  Note: Manually create a booking and test this endpoint"

# Test 4.3: Refund booking (requires a booking ID - placeholder)
echo -e "${YELLOW}⊘${NC} Test 4.3: POST /bookings/:id/refund (PLACEHOLDER - requires booking ID)"
echo "  Note: Manually create a booking and test this endpoint"

echo ""

echo "=========================================="
echo "TEST 5: Ticket Management"
echo "=========================================="

# Test 5.1: Get event tickets
if [ -n "$EVENT_ID" ]; then
    GET_TICKETS_RESPONSE=$(api_call GET "/tickets/event/$EVENT_ID" "" "$ORG_TOKEN")
    if echo "$GET_TICKETS_RESPONSE" | grep -q '"data"'; then
        print_test "Test 5.1: GET /tickets/event/:eventId" "PASS"
    else
        print_test "Test 5.1: GET /tickets/event/:eventId" "FAIL" "Response: $GET_TICKETS_RESPONSE"
    fi
else
    print_test "Test 5.1: GET /tickets/event/:eventId" "FAIL" "No event ID"
fi

# Test 5.2: Bulk validate tickets (requires ticket codes - placeholder)
echo -e "${YELLOW}⊘${NC} Test 5.2: POST /tickets/event/:eventId/bulk-validate (PLACEHOLDER - requires ticket codes)"
echo "  Note: Manually create tickets and test this endpoint"

# Test 5.3: Resend ticket email (requires ticket code - placeholder)
echo -e "${YELLOW}⊘${NC} Test 5.3: POST /tickets/:code/resend (PLACEHOLDER - requires ticket code)"
echo "  Note: Manually create a ticket and test this endpoint"

echo ""

echo "=========================================="
echo "TEST 6: Analytics"
echo "=========================================="

# Test 6.1: Get revenue analytics
REVENUE_RESPONSE=$(api_call GET "/organizer/analytics/revenue" "" "$ORG_TOKEN")
if echo "$REVENUE_RESPONSE" | grep -q '"totalRevenue"'; then
    print_test "Test 6.1: GET /organizer/analytics/revenue" "PASS"
else
    print_test "Test 6.1: GET /organizer/analytics/revenue" "FAIL" "Response: $REVENUE_RESPONSE"
fi

# Test 6.2: Get booking analytics
BOOKING_ANALYTICS_RESPONSE=$(api_call GET "/organizer/analytics/bookings" "" "$ORG_TOKEN")
if echo "$BOOKING_ANALYTICS_RESPONSE" | grep -q '"totalBookings"'; then
    print_test "Test 6.2: GET /organizer/analytics/bookings" "PASS"
else
    print_test "Test 6.2: GET /organizer/analytics/bookings" "FAIL" "Response: $BOOKING_ANALYTICS_RESPONSE"
fi

echo ""

echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All Organizer API tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please review the output above.${NC}"
    exit 1
fi

