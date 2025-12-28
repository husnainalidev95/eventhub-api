#!/bin/bash

# User APIs Test Script
# Tests all User endpoints: Auth, Events, Bookings, Tickets, Notifications, Common, Contact
# Note: Booking confirmation and refund tests are placeholders

set +e

BASE_URL="${BASE_URL:-http://localhost:3001/api}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "User APIs Test Script"
echo "=========================================="
echo ""

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Helper function to print test results
print_test() {
    local test_name=$1
    local status=$2
    local message=$3
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} $test_name"
        ((TESTS_PASSED++))
    elif [ "$status" = "SKIP" ]; then
        echo -e "${YELLOW}⊘${NC} $test_name (SKIPPED)"
        if [ -n "$message" ]; then
            echo "  Note: $message"
        fi
        ((TESTS_SKIPPED++))
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

echo "Step 1: Register and authenticate as user..."
REGISTER_RESPONSE=$(api_call POST /auth/register '{
    "name": "Test User",
    "email": "user-test-'$(date +%s)'@example.com",
    "password": "TestPass123!"
}')

if echo "$REGISTER_RESPONSE" | grep -q "accessToken"; then
    USER_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    USER_ID=$(extract_id "$REGISTER_RESPONSE")
    echo -e "${GREEN}✓${NC} User registered: $USER_ID"
    echo ""
else
    echo -e "${RED}✗${NC} Failed to register user"
    echo "Response: $REGISTER_RESPONSE"
    exit 1
fi

# Skip email verification (as requested)
SKIP_VERIFY_SCRIPT="const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.user.update({ where: { id: '$USER_ID' }, data: { emailVerified: true } }).then(() => { console.log('SUCCESS'); process.exit(0); }).catch((e) => { console.error('ERROR:', e.message); process.exit(1); });"
node -e "$SKIP_VERIFY_SCRIPT" > /dev/null 2>&1

echo "=========================================="
echo "TEST 1: Authentication"
echo "=========================================="

# Test 1.1: Get current user
GET_ME_RESPONSE=$(api_call GET "/auth/me" "" "$USER_TOKEN")
if echo "$GET_ME_RESPONSE" | grep -q '"id"'; then
    print_test "Test 1.1: GET /auth/me" "PASS"
else
    print_test "Test 1.1: GET /auth/me" "FAIL" "Response: $GET_ME_RESPONSE"
fi

# Test 1.2: Update profile
UPDATE_PROFILE_RESPONSE=$(api_call PATCH "/auth/profile" '{
    "name": "Updated Test User",
    "phone": "+1234567890"
}' "$USER_TOKEN")

if echo "$UPDATE_PROFILE_RESPONSE" | grep -q '"id"'; then
    print_test "Test 1.2: PATCH /auth/profile" "PASS"
else
    print_test "Test 1.2: PATCH /auth/profile" "FAIL" "Response: $UPDATE_PROFILE_RESPONSE"
fi

# Test 1.3: Change password
CHANGE_PASSWORD_RESPONSE=$(api_call PATCH "/auth/password" '{
    "currentPassword": "TestPass123!",
    "newPassword": "NewTestPass123!"
}' "$USER_TOKEN")

if echo "$CHANGE_PASSWORD_RESPONSE" | grep -q '"message"'; then
    print_test "Test 1.3: PATCH /auth/password" "PASS"
else
    print_test "Test 1.3: PATCH /auth/password" "FAIL" "Response: $CHANGE_PASSWORD_RESPONSE"
fi

# Test 1.4: Login (skip email verification)
LOGIN_RESPONSE=$(api_call POST /auth/login '{
    "email": "'$(echo "$REGISTER_RESPONSE" | grep -o '"email":"[^"]*' | cut -d'"' -f4)'",
    "password": "NewTestPass123!"
}')

if echo "$LOGIN_RESPONSE" | grep -q "accessToken"; then
    print_test "Test 1.4: POST /auth/login" "PASS"
    USER_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
else
    print_test "Test 1.4: POST /auth/login" "FAIL" "Response: $LOGIN_RESPONSE"
fi

# Test 1.5: Send verification email (skip - emails not working)
print_test "Test 1.5: POST /auth/send-verification" "SKIP" "Email verification skipped (emails not working)"

# Test 1.6: Forgot password (skip - emails not working)
print_test "Test 1.6: POST /auth/forgot-password" "SKIP" "Password reset skipped (emails not working)"

echo ""

echo "=========================================="
echo "TEST 2: Events"
echo "=========================================="

# Test 2.1: Get all events
GET_EVENTS_RESPONSE=$(api_call GET "/events" "" "")
if echo "$GET_EVENTS_RESPONSE" | grep -q '"data"'; then
    print_test "Test 2.1: GET /events" "PASS"
else
    print_test "Test 2.1: GET /events" "FAIL" "Response: $GET_EVENTS_RESPONSE"
fi

# Test 2.2: Get event by ID (if any events exist)
if command -v jq &> /dev/null; then
    FIRST_EVENT_ID=$(echo "$GET_EVENTS_RESPONSE" | jq -r '.data[0].id // empty' 2>/dev/null)
else
    FIRST_EVENT_ID=$(echo "$GET_EVENTS_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4 | tr -d '\n\r')
fi

if [ -n "$FIRST_EVENT_ID" ]; then
    GET_EVENT_RESPONSE=$(api_call GET "/events/$FIRST_EVENT_ID" "" "")
    if echo "$GET_EVENT_RESPONSE" | grep -q '"id"'; then
        print_test "Test 2.2: GET /events/:id" "PASS"
    else
        print_test "Test 2.2: GET /events/:id" "FAIL" "Response: $GET_EVENT_RESPONSE"
    fi
else
    print_test "Test 2.2: GET /events/:id" "SKIP" "No events available"
fi

echo ""

echo "=========================================="
echo "TEST 3: Bookings"
echo "=========================================="

# Test 3.1: Create seat hold
if [ -n "$FIRST_EVENT_ID" ]; then
    # Get ticket type ID from event
    GET_EVENT_FULL=$(api_call GET "/events/$FIRST_EVENT_ID" "" "")
    if command -v jq &> /dev/null; then
        TICKET_TYPE_ID=$(echo "$GET_EVENT_FULL" | jq -r '.ticketTypes[0].id // empty' 2>/dev/null)
    else
        TICKET_TYPE_ID=$(echo "$GET_EVENT_FULL" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4 | tr -d '\n\r')
    fi
    
    if [ -n "$TICKET_TYPE_ID" ]; then
        HOLD_RESPONSE=$(api_call POST "/bookings/hold" '{
            "eventId": "'"$FIRST_EVENT_ID"'",
            "ticketTypeId": "'"$TICKET_TYPE_ID"'",
            "quantity": 2
        }' "$USER_TOKEN")
        
        if echo "$HOLD_RESPONSE" | grep -q '"holdId"'; then
            if command -v jq &> /dev/null; then
                HOLD_ID=$(echo "$HOLD_RESPONSE" | jq -r '.holdId // empty' 2>/dev/null)
            else
                HOLD_ID=$(echo "$HOLD_RESPONSE" | grep -o '"holdId":"[^"]*' | cut -d'"' -f4 | tr -d '\n\r')
            fi
            print_test "Test 3.1: POST /bookings/hold" "PASS"
        else
            print_test "Test 3.1: POST /bookings/hold" "FAIL" "Response: $HOLD_RESPONSE"
            HOLD_ID=""
        fi
    else
        print_test "Test 3.1: POST /bookings/hold" "SKIP" "No ticket types available"
        HOLD_ID=""
    fi
else
    print_test "Test 3.1: POST /bookings/hold" "SKIP" "No events available"
    HOLD_ID=""
fi

# Test 3.2: Get hold details
if [ -n "$HOLD_ID" ]; then
    GET_HOLD_RESPONSE=$(api_call GET "/bookings/hold/$HOLD_ID" "" "$USER_TOKEN")
    if echo "$GET_HOLD_RESPONSE" | grep -q '"holdId"'; then
        print_test "Test 3.2: GET /bookings/hold/:holdId" "PASS"
    else
        print_test "Test 3.2: GET /bookings/hold/:holdId" "FAIL" "Response: $GET_HOLD_RESPONSE"
    fi
else
    print_test "Test 3.2: GET /bookings/hold/:holdId" "SKIP" "No hold ID"
fi

# Test 3.3: Create booking (PLACEHOLDER - requires payment)
print_test "Test 3.3: POST /bookings (PLACEHOLDER)" "SKIP" "Requires payment setup. Manually create a booking with: holdId, paymentMethodId"

# Test 3.4: Get user bookings
GET_BOOKINGS_RESPONSE=$(api_call GET "/bookings" "" "$USER_TOKEN")
if echo "$GET_BOOKINGS_RESPONSE" | grep -q '"data"'; then
    print_test "Test 3.4: GET /bookings" "PASS"
else
    print_test "Test 3.4: GET /bookings" "FAIL" "Response: $GET_BOOKINGS_RESPONSE"
fi

# Test 3.5: Get booking by ID (if any bookings exist)
if command -v jq &> /dev/null; then
    FIRST_BOOKING_ID=$(echo "$GET_BOOKINGS_RESPONSE" | jq -r '.data[0].id // empty' 2>/dev/null)
else
    FIRST_BOOKING_ID=$(echo "$GET_BOOKINGS_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4 | tr -d '\n\r')
fi

if [ -n "$FIRST_BOOKING_ID" ]; then
    GET_BOOKING_RESPONSE=$(api_call GET "/bookings/$FIRST_BOOKING_ID" "" "$USER_TOKEN")
    if echo "$GET_BOOKING_RESPONSE" | grep -q '"id"'; then
        print_test "Test 3.5: GET /bookings/:id" "PASS"
    else
        print_test "Test 3.5: GET /bookings/:id" "FAIL" "Response: $GET_BOOKING_RESPONSE"
    fi
else
    print_test "Test 3.5: GET /bookings/:id" "SKIP" "No bookings available"
fi

# Test 3.6: Cancel booking (if booking exists)
if [ -n "$FIRST_BOOKING_ID" ]; then
    CANCEL_RESPONSE=$(api_call DELETE "/bookings/$FIRST_BOOKING_ID" "" "$USER_TOKEN")
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X DELETE "$BASE_URL/bookings/$FIRST_BOOKING_ID" \
        -H "Authorization: Bearer $USER_TOKEN")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
        print_test "Test 3.6: DELETE /bookings/:id" "PASS"
    else
        print_test "Test 3.6: DELETE /bookings/:id" "FAIL" "HTTP Code: $HTTP_CODE"
    fi
else
    print_test "Test 3.6: DELETE /bookings/:id" "SKIP" "No bookings available"
fi

# Test 3.7: Booking confirmation (PLACEHOLDER)
print_test "Test 3.7: Booking Confirmation Email (PLACEHOLDER)" "SKIP" "Manually create a booking and verify confirmation email is sent"

# Test 3.8: Refund notification (PLACEHOLDER)
print_test "Test 3.8: Refund Notification (PLACEHOLDER)" "SKIP" "Manually process a refund and verify notification is created"

echo ""

echo "=========================================="
echo "TEST 4: Tickets"
echo "=========================================="

# Test 4.1: Get user tickets
GET_TICKETS_RESPONSE=$(api_call GET "/tickets" "" "$USER_TOKEN")
if echo "$GET_TICKETS_RESPONSE" | grep -q '"data"'; then
    print_test "Test 4.1: GET /tickets" "PASS"
else
    print_test "Test 4.1: GET /tickets" "FAIL" "Response: $GET_TICKETS_RESPONSE"
fi

# Test 4.2: Get ticket by code (if any tickets exist)
if command -v jq &> /dev/null; then
    FIRST_TICKET_CODE=$(echo "$GET_TICKETS_RESPONSE" | jq -r '.data[0].ticketCode // empty' 2>/dev/null)
else
    FIRST_TICKET_CODE=$(echo "$GET_TICKETS_RESPONSE" | grep -o '"ticketCode":"[^"]*' | head -1 | cut -d'"' -f4 | tr -d '\n\r')
fi

if [ -n "$FIRST_TICKET_CODE" ]; then
    GET_TICKET_RESPONSE=$(api_call GET "/tickets/$FIRST_TICKET_CODE" "" "$USER_TOKEN")
    if echo "$GET_TICKET_RESPONSE" | grep -q '"ticketCode"'; then
        print_test "Test 4.2: GET /tickets/:code" "PASS"
    else
        print_test "Test 4.2: GET /tickets/:code" "FAIL" "Response: $GET_TICKET_RESPONSE"
    fi
else
    print_test "Test 4.2: GET /tickets/:code" "SKIP" "No tickets available"
fi

# Test 4.3: Validate ticket (if ticket exists)
if [ -n "$FIRST_TICKET_CODE" ]; then
    VALIDATE_RESPONSE=$(api_call POST "/tickets/$FIRST_TICKET_CODE/validate" "" "$USER_TOKEN")
    if echo "$VALIDATE_RESPONSE" | grep -q '"status"'; then
        print_test "Test 4.3: POST /tickets/:code/validate" "PASS"
    else
        print_test "Test 4.3: POST /tickets/:code/validate" "FAIL" "Response: $VALIDATE_RESPONSE"
    fi
else
    print_test "Test 4.3: POST /tickets/:code/validate" "SKIP" "No tickets available"
fi

echo ""

echo "=========================================="
echo "TEST 5: Notifications"
echo "=========================================="

# Test 5.1: Get notifications
GET_NOTIFICATIONS_RESPONSE=$(api_call GET "/notifications" "" "$USER_TOKEN")
if echo "$GET_NOTIFICATIONS_RESPONSE" | grep -q '"data"'; then
    print_test "Test 5.1: GET /notifications" "PASS"
    
    # Extract notification ID if any exist
    if command -v jq &> /dev/null; then
        NOTIFICATION_ID=$(echo "$GET_NOTIFICATIONS_RESPONSE" | jq -r '.data[0].id // empty' 2>/dev/null)
    else
        NOTIFICATION_ID=$(echo "$GET_NOTIFICATIONS_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4 | tr -d '\n\r')
    fi
else
    print_test "Test 5.1: GET /notifications" "FAIL" "Response: $GET_NOTIFICATIONS_RESPONSE"
    NOTIFICATION_ID=""
fi

# Test 5.2: Mark notification as read
if [ -n "$NOTIFICATION_ID" ]; then
    MARK_READ_RESPONSE=$(api_call PATCH "/notifications/$NOTIFICATION_ID/read" "" "$USER_TOKEN")
    if echo "$MARK_READ_RESPONSE" | grep -q '"isRead"'; then
        print_test "Test 5.2: PATCH /notifications/:id/read" "PASS"
    else
        print_test "Test 5.2: PATCH /notifications/:id/read" "FAIL" "Response: $MARK_READ_RESPONSE"
    fi
else
    print_test "Test 5.2: PATCH /notifications/:id/read" "SKIP" "No notifications available"
fi

# Test 5.3: Mark all notifications as read
MARK_ALL_READ_RESPONSE=$(api_call PATCH "/notifications/read-all" "" "$USER_TOKEN")
if echo "$MARK_ALL_READ_RESPONSE" | grep -q '"message"'; then
    print_test "Test 5.3: PATCH /notifications/read-all" "PASS"
else
    print_test "Test 5.3: PATCH /notifications/read-all" "FAIL" "Response: $MARK_ALL_READ_RESPONSE"
fi

echo ""

echo "=========================================="
echo "TEST 6: Common Endpoints"
echo "=========================================="

# Test 6.1: Get categories
GET_CATEGORIES_RESPONSE=$(api_call GET "/categories" "" "")
if echo "$GET_CATEGORIES_RESPONSE" | grep -q '"categories"'; then
    print_test "Test 6.1: GET /categories" "PASS"
else
    print_test "Test 6.1: GET /categories" "FAIL" "Response: $GET_CATEGORIES_RESPONSE"
fi

# Test 6.2: Get cities
GET_CITIES_RESPONSE=$(api_call GET "/cities" "" "")
if echo "$GET_CITIES_RESPONSE" | grep -q '"cities"'; then
    print_test "Test 6.2: GET /cities" "PASS"
else
    print_test "Test 6.2: GET /cities" "FAIL" "Response: $GET_CITIES_RESPONSE"
fi

echo ""

echo "=========================================="
echo "TEST 7: Contact Form"
echo "=========================================="

# Test 7.1: Submit contact form
CONTACT_RESPONSE=$(api_call POST /contact '{
    "name": "Test User",
    "email": "test@example.com",
    "subject": "Test Inquiry",
    "message": "This is a test message for the contact form."
}' "")

if echo "$CONTACT_RESPONSE" | grep -q '"message"'; then
    print_test "Test 7.1: POST /contact" "PASS"
else
    print_test "Test 7.1: POST /contact" "FAIL" "Response: $CONTACT_RESPONSE"
fi

echo ""

echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
if [ $TESTS_SKIPPED -gt 0 ]; then
    echo -e "${YELLOW}Skipped: $TESTS_SKIPPED${NC}"
fi
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
fi
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    if [ $TESTS_SKIPPED -gt 0 ]; then
        echo -e "${GREEN}Core user API tests passed!${NC}"
        echo -e "${YELLOW}Note: Some tests were skipped (placeholders for manual testing).${NC}"
    else
        echo -e "${GREEN}All User API tests passed!${NC}"
    fi
    exit 0
else
    echo -e "${RED}Some tests failed. Please review the output above.${NC}"
    exit 1
fi

