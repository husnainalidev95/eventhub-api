#!/bin/bash

# Admin APIs Test Script
# Tests all Admin endpoints: User Management, Event Management, Statistics, Categories, Cities

set +e

BASE_URL="${BASE_URL:-http://localhost:3001/api}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Admin APIs Test Script"
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

echo "Step 1: Register and authenticate as admin..."
REGISTER_RESPONSE=$(api_call POST /auth/register '{
    "name": "Test Admin",
    "email": "admin-test-'$(date +%s)'@example.com",
    "password": "TestPass123!"
}')

if echo "$REGISTER_RESPONSE" | grep -q "accessToken"; then
    ADMIN_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    ADMIN_ID=$(extract_id "$REGISTER_RESPONSE")
    echo -e "${GREEN}✓${NC} Admin registered: $ADMIN_ID"
    echo ""
else
    echo -e "${RED}✗${NC} Failed to register admin"
    echo "Response: $REGISTER_RESPONSE"
    exit 1
fi

# Upgrade to ADMIN role
UPGRADE_SCRIPT="const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.user.update({ where: { id: '$ADMIN_ID' }, data: { role: 'ADMIN', emailVerified: true } }).then(() => { console.log('SUCCESS'); process.exit(0); }).catch((e) => { console.error('ERROR:', e.message); process.exit(1); });"
UPGRADE_OUTPUT=$(node -e "$UPGRADE_SCRIPT" 2>&1)
if echo "$UPGRADE_OUTPUT" | grep -q "SUCCESS"; then
    echo -e "${GREEN}✓${NC} User upgraded to ADMIN role"
    echo ""
else
    echo -e "${YELLOW}⚠${NC} Could not upgrade user automatically. Some tests may fail."
    echo ""
fi

# Register a test user for user management tests
echo "Step 2: Register test user for user management tests..."
REGISTER_USER_RESPONSE=$(api_call POST /auth/register '{
    "name": "Test User Admin",
    "email": "user-admin-'$(date +%s)'@example.com",
    "password": "TestPass123!"
}')

if echo "$REGISTER_USER_RESPONSE" | grep -q "accessToken"; then
    TEST_USER_ID=$(extract_id "$REGISTER_USER_RESPONSE")
    echo -e "${GREEN}✓${NC} Test user registered: $TEST_USER_ID"
    echo ""
else
    echo -e "${RED}✗${NC} Failed to register test user"
    exit 1
fi

echo "=========================================="
echo "TEST 1: User Management"
echo "=========================================="

# Test 1.1: Get all users
GET_USERS_RESPONSE=$(api_call GET "/admin/users" "" "$ADMIN_TOKEN")
if echo "$GET_USERS_RESPONSE" | grep -q '"data"'; then
    print_test "Test 1.1: GET /admin/users" "PASS"
else
    print_test "Test 1.1: GET /admin/users" "FAIL" "Response: $GET_USERS_RESPONSE"
fi

# Test 1.2: Get user by ID
if [ -n "$TEST_USER_ID" ]; then
    GET_USER_RESPONSE=$(api_call GET "/admin/users/$TEST_USER_ID" "" "$ADMIN_TOKEN")
    if echo "$GET_USER_RESPONSE" | grep -q '"id"'; then
        print_test "Test 1.2: GET /admin/users/:id" "PASS"
    else
        print_test "Test 1.2: GET /admin/users/:id" "FAIL" "Response: $GET_USER_RESPONSE"
    fi
else
    print_test "Test 1.2: GET /admin/users/:id" "FAIL" "No test user ID"
fi

# Test 1.3: Create organizer
CREATE_ORG_RESPONSE=$(api_call POST "/admin/users/create-organizer" '{
    "name": "Test Organizer Admin",
    "email": "organizer-admin-'$(date +%s)'@example.com",
    "password": "TestPass123!"
}' "$ADMIN_TOKEN")

if echo "$CREATE_ORG_RESPONSE" | grep -q '"id"'; then
    CREATED_ORG_ID=$(extract_id "$CREATE_ORG_RESPONSE")
    print_test "Test 1.3: POST /admin/users/create-organizer" "PASS"
else
    print_test "Test 1.3: POST /admin/users/create-organizer" "FAIL" "Response: $CREATE_ORG_RESPONSE"
    CREATED_ORG_ID=""
fi

# Test 1.4: Update user role
if [ -n "$TEST_USER_ID" ]; then
    UPDATE_ROLE_RESPONSE=$(api_call PATCH "/admin/users/$TEST_USER_ID/role" '{
        "role": "ORGANIZER"
    }' "$ADMIN_TOKEN")
    if echo "$UPDATE_ROLE_RESPONSE" | grep -q '"role"'; then
        print_test "Test 1.4: PATCH /admin/users/:id/role" "PASS"
    else
        print_test "Test 1.4: PATCH /admin/users/:id/role" "FAIL" "Response: $UPDATE_ROLE_RESPONSE"
    fi
else
    print_test "Test 1.4: PATCH /admin/users/:id/role" "FAIL" "No test user ID"
fi

# Test 1.5: Update user status
if [ -n "$TEST_USER_ID" ]; then
    UPDATE_STATUS_RESPONSE=$(api_call PATCH "/admin/users/$TEST_USER_ID/status" '{
        "isActive": false
    }' "$ADMIN_TOKEN")
    if echo "$UPDATE_STATUS_RESPONSE" | grep -q '"isActive"'; then
        print_test "Test 1.5: PATCH /admin/users/:id/status" "PASS"
    else
        print_test "Test 1.5: PATCH /admin/users/:id/status" "FAIL" "Response: $UPDATE_STATUS_RESPONSE"
    fi
else
    print_test "Test 1.5: PATCH /admin/users/:id/status" "FAIL" "No test user ID"
fi

echo ""

echo "=========================================="
echo "TEST 2: Event Management"
echo "=========================================="

# Test 2.1: Get all events (admin view)
GET_EVENTS_RESPONSE=$(api_call GET "/admin/events" "" "$ADMIN_TOKEN")
if echo "$GET_EVENTS_RESPONSE" | grep -q '"data"'; then
    print_test "Test 2.1: GET /admin/events" "PASS"
else
    print_test "Test 2.1: GET /admin/events" "FAIL" "Response: $GET_EVENTS_RESPONSE"
fi

echo ""

echo "=========================================="
echo "TEST 3: Statistics"
echo "=========================================="

# Test 3.1: Get platform statistics
GET_STATS_RESPONSE=$(api_call GET "/admin/statistics" "" "$ADMIN_TOKEN")
if echo "$GET_STATS_RESPONSE" | grep -q '"totalUsers"'; then
    print_test "Test 3.1: GET /admin/statistics" "PASS"
else
    print_test "Test 3.1: GET /admin/statistics" "FAIL" "Response: $GET_STATS_RESPONSE"
fi

# Test 3.2: Get statistics with custom period
GET_STATS_CUSTOM_RESPONSE=$(api_call GET "/admin/statistics?period=year" "" "$ADMIN_TOKEN")
if echo "$GET_STATS_CUSTOM_RESPONSE" | grep -q '"totalUsers"'; then
    print_test "Test 3.2: GET /admin/statistics with period" "PASS"
else
    print_test "Test 3.2: GET /admin/statistics with period" "FAIL" "Response: $GET_STATS_CUSTOM_RESPONSE"
fi

echo ""

echo "=========================================="
echo "TEST 4: Category Management"
echo "=========================================="

# Test 4.1: Get all categories
GET_CATEGORIES_RESPONSE=$(api_call GET "/admin/categories" "" "$ADMIN_TOKEN")
if echo "$GET_CATEGORIES_RESPONSE" | grep -q '"data"'; then
    print_test "Test 4.1: GET /admin/categories" "PASS"
else
    print_test "Test 4.1: GET /admin/categories" "FAIL" "Response: $GET_CATEGORIES_RESPONSE"
fi

# Test 4.2: Create category
CREATE_CAT_RESPONSE=$(api_call POST "/admin/categories" '{
    "name": "Test Category Admin",
    "description": "Test category for admin APIs",
    "icon": "https://example.com/icon.svg"
}' "$ADMIN_TOKEN")

if echo "$CREATE_CAT_RESPONSE" | grep -q '"id"'; then
    CATEGORY_ID=$(extract_id "$CREATE_CAT_RESPONSE")
    print_test "Test 4.2: POST /admin/categories" "PASS"
else
    print_test "Test 4.2: POST /admin/categories" "FAIL" "Response: $CREATE_CAT_RESPONSE"
    CATEGORY_ID=""
fi

# Test 4.3: Get category by ID
if [ -n "$CATEGORY_ID" ]; then
    GET_CAT_RESPONSE=$(api_call GET "/admin/categories/$CATEGORY_ID" "" "$ADMIN_TOKEN")
    if echo "$GET_CAT_RESPONSE" | grep -q '"id"'; then
        print_test "Test 4.3: GET /admin/categories/:id" "PASS"
    else
        print_test "Test 4.3: GET /admin/categories/:id" "FAIL" "Response: $GET_CAT_RESPONSE"
    fi
else
    print_test "Test 4.3: GET /admin/categories/:id" "FAIL" "No category ID"
fi

# Test 4.4: Update category
if [ -n "$CATEGORY_ID" ]; then
    UPDATE_CAT_RESPONSE=$(api_call PATCH "/admin/categories/$CATEGORY_ID" '{
        "description": "Updated description"
    }' "$ADMIN_TOKEN")
    if echo "$UPDATE_CAT_RESPONSE" | grep -q '"id"'; then
        print_test "Test 4.4: PATCH /admin/categories/:id" "PASS"
    else
        print_test "Test 4.4: PATCH /admin/categories/:id" "FAIL" "Response: $UPDATE_CAT_RESPONSE"
    fi
else
    print_test "Test 4.4: PATCH /admin/categories/:id" "FAIL" "No category ID"
fi

# Test 4.5: Delete category (skip if has events)
if [ -n "$CATEGORY_ID" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X DELETE "$BASE_URL/admin/categories/$CATEGORY_ID" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "400" ]; then
        print_test "Test 4.5: DELETE /admin/categories/:id" "PASS"
    else
        print_test "Test 4.5: DELETE /admin/categories/:id" "FAIL" "HTTP Code: $HTTP_CODE"
    fi
else
    print_test "Test 4.5: DELETE /admin/categories/:id" "FAIL" "No category ID"
fi

echo ""

echo "=========================================="
echo "TEST 5: City Management"
echo "=========================================="

# Test 5.1: Get all cities
GET_CITIES_RESPONSE=$(api_call GET "/admin/cities" "" "$ADMIN_TOKEN")
if echo "$GET_CITIES_RESPONSE" | grep -q '"data"'; then
    print_test "Test 5.1: GET /admin/cities" "PASS"
else
    print_test "Test 5.1: GET /admin/cities" "FAIL" "Response: $GET_CITIES_RESPONSE"
fi

# Test 5.2: Create city
CREATE_CITY_RESPONSE=$(api_call POST "/admin/cities" '{
    "name": "Test City Admin",
    "state": "TX",
    "country": "USA"
}' "$ADMIN_TOKEN")

if echo "$CREATE_CITY_RESPONSE" | grep -q '"id"'; then
    CITY_ID=$(extract_id "$CREATE_CITY_RESPONSE")
    print_test "Test 5.2: POST /admin/cities" "PASS"
else
    print_test "Test 5.2: POST /admin/cities" "FAIL" "Response: $CREATE_CITY_RESPONSE"
    CITY_ID=""
fi

# Test 5.3: Get city by ID
if [ -n "$CITY_ID" ]; then
    GET_CITY_RESPONSE=$(api_call GET "/admin/cities/$CITY_ID" "" "$ADMIN_TOKEN")
    if echo "$GET_CITY_RESPONSE" | grep -q '"id"'; then
        print_test "Test 5.3: GET /admin/cities/:id" "PASS"
    else
        print_test "Test 5.3: GET /admin/cities/:id" "FAIL" "Response: $GET_CITY_RESPONSE"
    fi
else
    print_test "Test 5.3: GET /admin/cities/:id" "FAIL" "No city ID"
fi

# Test 5.4: Update city
if [ -n "$CITY_ID" ]; then
    UPDATE_CITY_RESPONSE=$(api_call PATCH "/admin/cities/$CITY_ID" '{
        "state": "CA"
    }' "$ADMIN_TOKEN")
    if echo "$UPDATE_CITY_RESPONSE" | grep -q '"id"'; then
        print_test "Test 5.4: PATCH /admin/cities/:id" "PASS"
    else
        print_test "Test 5.4: PATCH /admin/cities/:id" "FAIL" "Response: $UPDATE_CITY_RESPONSE"
    fi
else
    print_test "Test 5.4: PATCH /admin/cities/:id" "FAIL" "No city ID"
fi

# Test 5.5: Delete city (skip if has events)
if [ -n "$CITY_ID" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X DELETE "$BASE_URL/admin/cities/$CITY_ID" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "400" ]; then
        print_test "Test 5.5: DELETE /admin/cities/:id" "PASS"
    else
        print_test "Test 5.5: DELETE /admin/cities/:id" "FAIL" "HTTP Code: $HTTP_CODE"
    fi
else
    print_test "Test 5.5: DELETE /admin/cities/:id" "FAIL" "No city ID"
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
    echo -e "${GREEN}All Admin API tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please review the output above.${NC}"
    exit 1
fi

