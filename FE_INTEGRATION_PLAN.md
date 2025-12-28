# EventHub API - Frontend Integration Guide

**Complete API reference for frontend developers integrating with EventHub backend**

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Base Configuration](#base-configuration)
3. [Authentication APIs](#authentication-apis)
4. [Event Discovery APIs](#event-discovery-apis)
5. [Booking & Payment Flow](#booking--payment-flow)
6. [User Dashboard APIs](#user-dashboard-apis)
7. [Organizer Dashboard APIs](#organizer-dashboard-apis)
8. [Admin Dashboard APIs](#admin-dashboard-apis)
9. [Common APIs](#common-apis)
10. [WebSocket Integration](#websocket-integration)
11. [Error Handling](#error-handling)

---

## Quick Start

### 1. Base URL
```
http://localhost:3001/api
```

### 2. Authentication Header
```javascript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### 3. Example API Call
```javascript
const response = await fetch('http://localhost:3001/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
const user = await response.json();
```

---

## Base Configuration

**Base URL:** `http://localhost:3001/api` (or your production URL)

**Authentication:** JWT token in `Authorization` header
```
Authorization: Bearer <token>
```

**Content Type:** `application/json` for all POST/PATCH requests

**CORS:** Configured for `http://localhost:3000` (update `FRONTEND_URL` in production)

---

## Authentication APIs

### Register User

**Endpoint:** `POST /auth/register`

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "phone": "+1234567890"
}
```

**Response (201):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER",
    "isActive": true,
    "emailVerified": false
  }
}
```

**Next Steps:**
- Save `accessToken` to localStorage
- Save `user` object to state
- Redirect based on role

---

### Login User

**Endpoint:** `POST /auth/login`

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER"
  }
}
```

---

### Get Current User

**Endpoint:** `GET /auth/me`

**Auth:** Required

**Response (200):**
```json
{
  "id": "user_id",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "USER",
  "phone": "+1234567890",
  "avatar": "https://cloudinary.com/avatar.jpg",
  "isActive": true,
  "emailVerified": true,
  "createdAt": "2025-12-28T10:00:00.000Z"
}
```

**Use Cases:**
- App initialization (check if logged in)
- Refresh user data
- Verify token validity

---

### Update Profile

**Endpoint:** `PATCH /auth/profile`

**Auth:** Required

**Request:**
```json
{
  "name": "Jane Doe",
  "phone": "+19876543210",
  "avatar": "https://cloudinary.com/avatar.jpg"
}
```

**Response (200):** Updated user object

---

### Change Password

**Endpoint:** `PATCH /auth/password`

**Auth:** Required

**Request:**
```json
{
  "currentPassword": "OldPass123",
  "newPassword": "NewSecurePass456"
}
```

**Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

---

### Email Verification

**Endpoint:** `POST /auth/send-verification`

**Auth:** Required

**Response (200):**
```json
{
  "message": "Verification email sent"
}
```

**Verify Email:**
**Endpoint:** `POST /auth/verify-email`

**Request:**
```json
{
  "token": "verification_token_from_email"
}
```

---

### Password Reset

**Request Reset:**
**Endpoint:** `POST /auth/forgot-password`

**Request:**
```json
{
  "email": "john@example.com"
}
```

**Reset Password:**
**Endpoint:** `POST /auth/reset-password`

**Request:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePass456"
}
```

---

## Event Discovery APIs

### Browse Events

**Endpoint:** `GET /events`

**Query Parameters:**
- `search` - Search in title/description
- `categoryId` - Filter by category ID
- `cityId` - Filter by city ID
- `status` - Filter by status (DRAFT, ACTIVE, CANCELLED, COMPLETED)
- `featured` - Filter featured events (true/false)
- `dateFrom` - Filter from date (ISO format)
- `dateTo` - Filter to date (ISO format)
- `minPrice` - Minimum ticket price
- `maxPrice` - Maximum ticket price
- `organizerId` - Filter by organizer (for organizer's own events)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

**Example:**
```
GET /events?search=conference&cityId=city123&status=ACTIVE&page=1&limit=12
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "event_id",
      "title": "Tech Conference 2025",
      "description": "Annual technology conference",
      "date": "2025-06-15T00:00:00.000Z",
      "time": "09:00 AM",
      "venue": "Convention Center",
      "address": "123 Tech Street",
      "image": "https://cloudinary.com/image.jpg",
      "status": "ACTIVE",
      "featured": true,
      "organizer": {
        "id": "organizer_id",
        "name": "Tech Events Inc",
        "companyName": "Tech Events Inc"
      },
      "categoryRef": {
        "id": "category_id",
        "name": "Technology",
        "slug": "technology"
      },
      "cityRef": {
        "id": "city_id",
        "name": "San Francisco",
        "state": "CA",
        "country": "USA"
      },
      "ticketTypes": [
        {
          "id": "ticket_type_id",
          "name": "General Admission",
          "price": 50.00,
          "total": 100,
          "available": 85
        }
      ]
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 12,
    "totalPages": 5
  }
}
```

---

### Get Event Details

**Endpoint:** `GET /events/:id`

**Response (200):** Full event object with all details

---

## Booking & Payment Flow

### Complete Flow

```
1. User clicks "Book Now"
2. POST /bookings/hold → Get holdId
3. POST /payment/create-intent → Get clientSecret
4. Confirm payment with Stripe.js (frontend)
5. Webhook automatically creates booking
6. GET /bookings → Verify booking created
```

---

### Step 1: Create Seat Hold

**Endpoint:** `POST /bookings/hold`

**Auth:** Required

**Request:**
```json
{
  "eventId": "event_id",
  "ticketTypeId": "ticket_type_id",
  "quantity": 2
}
```

**Response (200):**
```json
{
  "holdId": "hold_12345",
  "eventId": "event_id",
  "ticketTypeId": "ticket_type_id",
  "quantity": 2,
  "expiresAt": "2025-12-28T10:10:00.000Z",
  "totalAmount": 100.00,
  "event": {
    "title": "Tech Conference 2025",
    "date": "2025-06-15T00:00:00.000Z"
  }
}
```

**Important:**
- Hold expires in 10 minutes
- Show countdown timer
- Tickets are temporarily unavailable

---

### Step 2: Create Payment Intent

**Endpoint:** `POST /payment/create-intent`

**Auth:** Required

**Request:**
```json
{
  "holdId": "hold_12345"
}
```

**Response (200):**
```json
{
  "clientSecret": "pi_3ABC123_secret_XYZ789",
  "paymentIntentId": "pi_3ABC123",
  "amount": 10000,
  "currency": "usd"
}
```

**Note:** `amount` is in cents (10000 = $100.00)

---

### Step 3: Confirm Payment (Frontend)

**Use Stripe.js on frontend:**

```javascript
import { loadStripe } from '@stripe/stripe-js';

const stripe = await loadStripe('pk_test_YOUR_PUBLISHABLE_KEY');

const { error, paymentIntent } = await stripe.confirmCardPayment(
  clientSecret,
  {
    payment_method: {
      card: cardElement,
      billing_details: {
        name: 'John Doe',
        email: 'john@example.com',
      },
    },
  }
);

if (paymentIntent.status === 'succeeded') {
  // Payment successful!
  // Backend webhook will create booking automatically
  // Poll GET /bookings to verify booking created
}
```

---

### Step 4: Verify Booking Created

**Endpoint:** `GET /bookings`

**Auth:** Required

**Response:** List of user's bookings including the new one

---

### Cancel Booking

**Endpoint:** `DELETE /bookings/:id`

**Auth:** Required (must be booking owner)

**Response (200):**
```json
{
  "message": "Booking cancelled successfully"
}
```

**What happens:**
- Booking status → CANCELLED
- Automatic refund via Stripe
- Tickets become available again
- Cancellation email sent

---

## User Dashboard APIs

### Get My Bookings

**Endpoint:** `GET /bookings`

**Auth:** Required

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `status` - Filter by status (PENDING, CONFIRMED, CANCELLED)

**Response (200):**
```json
{
  "data": [
    {
      "id": "booking_id",
      "bookingCode": "BK-ABC123",
      "quantity": 2,
      "totalAmount": 100.00,
      "status": "CONFIRMED",
      "paymentStatus": "PAID",
      "createdAt": "2025-12-28T10:00:00.000Z",
      "event": {
        "id": "event_id",
        "title": "Tech Conference 2025",
        "date": "2025-06-15T00:00:00.000Z",
        "image": "https://cloudinary.com/image.jpg"
      },
      "tickets": [
        {
          "id": "ticket_id",
          "ticketCode": "TKT-ABC123",
          "status": "VALID"
        }
      ]
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### Get Booking Details

**Endpoint:** `GET /bookings/:id`

**Auth:** Required (must be booking owner)

**Response:** Complete booking object with all tickets and QR codes

---

### Get My Tickets

**Endpoint:** `GET /tickets`

**Auth:** Required

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `status` - Filter by status (VALID, USED, CANCELLED, EXPIRED)

**Response (200):**
```json
{
  "data": [
    {
      "id": "ticket_id",
      "ticketCode": "TKT-ABC123",
      "qrCodeData": "https://api.qrserver.com/v1/create-qr-code/?data=TKT-ABC123",
      "status": "VALID",
      "event": {
        "title": "Tech Conference 2025",
        "date": "2025-06-15T00:00:00.000Z",
        "venue": "Convention Center"
      },
      "ticketType": {
        "name": "General Admission",
        "price": 50.00
      }
    }
  ],
  "meta": {
    "total": 3,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### Get Ticket by Code

**Endpoint:** `GET /tickets/:code`

**Auth:** Required (must be ticket owner)

**Response:** Complete ticket object with QR code

---

### Get Notifications

**Endpoint:** `GET /notifications`

**Auth:** Required

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `isRead` - Filter by read status (true/false)

**Response (200):**
```json
{
  "data": [
    {
      "id": "notification_id",
      "type": "BOOKING_CONFIRMED",
      "title": "Booking Confirmed",
      "message": "Your booking for Tech Conference 2025 has been confirmed",
      "isRead": false,
      "createdAt": "2025-12-28T10:00:00.000Z",
      "data": {
        "bookingId": "booking_id",
        "eventId": "event_id"
      }
    }
  ],
  "meta": {
    "total": 10,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### Mark Notification as Read

**Endpoint:** `PATCH /notifications/:id/read`

**Auth:** Required

**Response (200):** Updated notification object

---

### Mark All Notifications as Read

**Endpoint:** `PATCH /notifications/read-all`

**Auth:** Required

**Response (200):**
```json
{
  "message": "All notifications marked as read"
}
```

---

### Submit Contact Form

**Endpoint:** `POST /contact`

**Auth:** Not required

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "General Inquiry",
  "message": "I would like to know more about your platform."
}
```

**Response (200):**
```json
{
  "message": "Thank you for contacting us! We have received your message and will get back to you soon."
}
```

---

## Organizer Dashboard APIs

### Create Event

**Endpoint:** `POST /events`

**Auth:** Required (ORGANIZER role)

**Request:**
```json
{
  "title": "Tech Conference 2025",
  "description": "Annual technology conference",
  "categoryId": "category_id",
  "cityId": "city_id",
  "date": "2025-06-15T00:00:00.000Z",
  "time": "09:00 AM",
  "venue": "Convention Center",
  "address": "123 Tech Street",
  "image": "https://cloudinary.com/image.jpg"
}
```

**Response (201):** Created event object (status: DRAFT)

---

### Update Event

**Endpoint:** `PUT /events/:id`

**Auth:** Required (must be event owner)

**Request:** Same as create, all fields optional

**Response (200):** Updated event object

---

### Publish Event

**Endpoint:** `PATCH /events/:id/publish`

**Auth:** Required (must be event owner)

**Response (200):** Event with status: ACTIVE

---

### Unpublish Event

**Endpoint:** `PATCH /events/:id/unpublish`

**Auth:** Required (must be event owner)

**Response (200):** Event with status: DRAFT

---

### Cancel Event

**Endpoint:** `PATCH /events/:id/cancel`

**Auth:** Required (must be event owner)

**Response (200):** Event with status: CANCELLED

**Note:** Sends notifications to all attendees

---

### Duplicate Event

**Endpoint:** `POST /events/:id/duplicate`

**Auth:** Required (must be event owner)

**Response (201):** New event (status: DRAFT, dates adjusted)

---

### Toggle Featured Status

**Endpoint:** `PATCH /events/:id/feature`

**Auth:** Required (must be event owner)

**Response (200):** Event with updated `featured` status

---

### Get Event Analytics

**Endpoint:** `GET /events/:id/analytics`

**Auth:** Required (must be event owner)

**Response (200):**
```json
{
  "eventId": "event_id",
  "summary": {
    "totalBookings": 25,
    "totalTicketsSold": 50,
    "totalRevenue": 2500.00,
    "checkedIn": 35,
    "checkInRate": 70.0
  },
  "ticketTypes": [
    {
      "name": "General Admission",
      "sold": 40,
      "available": 60,
      "revenue": 2000.00
    }
  ]
}
```

---

### Create Ticket Type

**Endpoint:** `POST /events/:eventId/ticket-types`

**Auth:** Required (must be event owner)

**Request:**
```json
{
  "name": "General Admission",
  "description": "Standard entry ticket",
  "price": 50.00,
  "total": 100
}
```

**Response (201):** Created ticket type

---

### Update Ticket Type

**Endpoint:** `PATCH /events/:eventId/ticket-types/:id`

**Auth:** Required (must be event owner)

**Request:** All fields optional

**Response (200):** Updated ticket type

---

### Delete Ticket Type

**Endpoint:** `DELETE /events/:eventId/ticket-types/:id`

**Auth:** Required (must be event owner)

**Response (200):**
```json
{
  "message": "Ticket type deleted successfully"
}
```

---

### Get Event Bookings

**Endpoint:** `GET /bookings/event/:eventId`

**Auth:** Required (must be event owner)

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `status` - Filter by booking status

**Response (200):** List of bookings for the event

---

### Update Booking Status

**Endpoint:** `PATCH /bookings/:id/status`

**Auth:** Required (must be event owner)

**Request:**
```json
{
  "status": "CONFIRMED"
}
```

**Response (200):** Updated booking

---

### Process Refund

**Endpoint:** `POST /bookings/:id/refund`

**Auth:** Required (must be event owner)

**Request:**
```json
{
  "reason": "Customer request"
}
```

**Response (200):**
```json
{
  "message": "Refund processed successfully",
  "refundId": "re_12345"
}
```

---

### Get Event Tickets

**Endpoint:** `GET /tickets/event/:eventId`

**Auth:** Required (must be event owner)

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `status` - Filter by ticket status

**Response (200):** List of tickets for the event

---

### Bulk Validate Tickets

**Endpoint:** `POST /tickets/event/:eventId/bulk-validate`

**Auth:** Required (must be event owner)

**Request:**
```json
{
  "ticketCodes": ["TKT-ABC123", "TKT-DEF456"]
}
```

**Response (200):**
```json
{
  "validated": 2,
  "failed": 0,
  "results": [
    {
      "ticketCode": "TKT-ABC123",
      "status": "USED",
      "success": true
    }
  ]
}
```

---

### Resend Ticket Email

**Endpoint:** `POST /tickets/:code/resend`

**Auth:** Required (must be event owner)

**Response (200):**
```json
{
  "message": "Ticket email resent successfully"
}
```

---

### Update Organizer Profile

**Endpoint:** `PATCH /organizer/profile`

**Auth:** Required (ORGANIZER role)

**Request:**
```json
{
  "companyName": "Tech Events Inc",
  "description": "We organize amazing tech events",
  "website": "https://techevents.com",
  "logo": "https://cloudinary.com/logo.jpg"
}
```

**Response (200):** Updated organizer profile

---

### Get Public Organizer Profile

**Endpoint:** `GET /organizer/:id/public`

**Auth:** Not required

**Response (200):**
```json
{
  "id": "organizer_id",
  "name": "Tech Events Inc",
  "companyName": "Tech Events Inc",
  "description": "We organize amazing tech events",
  "website": "https://techevents.com",
  "logo": "https://cloudinary.com/logo.jpg",
  "statistics": {
    "totalEvents": 15,
    "totalBookings": 500,
    "totalRevenue": 50000.00
  }
}
```

---

### Get Revenue Analytics

**Endpoint:** `GET /organizer/analytics/revenue`

**Auth:** Required (ORGANIZER role)

**Query Parameters:**
- `period` - Time period (day, week, month, year, custom)
- `startDate` - Start date (if period=custom)
- `endDate` - End date (if period=custom)

**Response (200):**
```json
{
  "period": {
    "type": "month",
    "startDate": "2025-11-28T00:00:00.000Z",
    "endDate": "2025-12-28T00:00:00.000Z"
  },
  "totalRevenue": 25000.00,
  "revenueByEvent": [
    {
      "eventId": "event_id",
      "eventTitle": "Tech Conference 2025",
      "revenue": 10000.00
    }
  ],
  "revenueByDate": [
    {
      "date": "2025-12-01",
      "revenue": 5000.00
    }
  ]
}
```

---

### Get Booking Analytics

**Endpoint:** `GET /organizer/analytics/bookings`

**Auth:** Required (ORGANIZER role)

**Query Parameters:** Same as revenue analytics

**Response (200):**
```json
{
  "totalBookings": 150,
  "bookingsByStatus": {
    "CONFIRMED": 120,
    "CANCELLED": 30
  },
  "bookingsByEvent": [
    {
      "eventId": "event_id",
      "eventTitle": "Tech Conference 2025",
      "bookings": 50
    }
  ]
}
```

---

## Admin Dashboard APIs

### Get All Users

**Endpoint:** `GET /admin/users`

**Auth:** Required (ADMIN role)

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `role` - Filter by role (USER, ORGANIZER, ADMIN)
- `isActive` - Filter by active status
- `search` - Search by name or email

**Response (200):** Paginated list of users

---

### Get User Details

**Endpoint:** `GET /admin/users/:id`

**Auth:** Required (ADMIN role)

**Response (200):** Complete user object with related data

---

### Create Organizer

**Endpoint:** `POST /admin/users/create-organizer`

**Auth:** Required (ADMIN role)

**Request:**
```json
{
  "name": "Event Organizer",
  "email": "organizer@example.com",
  "password": "SecurePass123",
  "companyName": "EventCo Inc",
  "phone": "+1234567890"
}
```

**Response (201):** Created organizer user

---

### Update User Role

**Endpoint:** `PATCH /admin/users/:id/role`

**Auth:** Required (ADMIN role)

**Request:**
```json
{
  "role": "ORGANIZER",
  "companyName": "New Company Name"
}
```

**Response (200):** Updated user

---

### Update User Status

**Endpoint:** `PATCH /admin/users/:id/status`

**Auth:** Required (ADMIN role)

**Request:**
```json
{
  "isActive": false
}
```

**Response (200):** Updated user

---

### Delete User

**Endpoint:** `DELETE /admin/users/:id`

**Auth:** Required (ADMIN role)

**Response (200):**
```json
{
  "message": "User deleted successfully"
}
```

---

### Get All Events (Admin View)

**Endpoint:** `GET /admin/events`

**Auth:** Required (ADMIN role)

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `status` - Filter by status
- `organizerId` - Filter by organizer
- `startDate` - Filter from date
- `endDate` - Filter to date
- `search` - Search by title/description

**Response (200):** Paginated list of events with statistics

---

### Get Platform Statistics

**Endpoint:** `GET /admin/statistics`

**Auth:** Required (ADMIN role)

**Query Parameters:**
- `period` - Time period (day, week, month, year, custom)
- `startDate` - Start date (if period=custom)
- `endDate` - End date (if period=custom)

**Response (200):**
```json
{
  "period": {
    "type": "month",
    "startDate": "2025-11-28T00:00:00.000Z",
    "endDate": "2025-12-28T00:00:00.000Z"
  },
  "overview": {
    "totalUsers": 150,
    "totalEvents": 45,
    "totalBookings": 320,
    "totalRevenue": 25000.00
  },
  "distributions": {
    "roles": [
      {"role": "USER", "count": 120},
      {"role": "ORGANIZER", "count": 25},
      {"role": "ADMIN", "count": 5}
    ],
    "eventStatus": [...],
    "categories": [...],
    "cities": [...]
  }
}
```

---

### Category Management

**Get Categories:**
**Endpoint:** `GET /admin/categories`

**Create Category:**
**Endpoint:** `POST /admin/categories`
```json
{
  "name": "Technology",
  "description": "Tech events",
  "icon": "https://example.com/icon.svg"
}
```

**Update Category:**
**Endpoint:** `PATCH /admin/categories/:id`

**Delete Category:**
**Endpoint:** `DELETE /admin/categories/:id`

---

### City Management

**Get Cities:**
**Endpoint:** `GET /admin/cities`

**Create City:**
**Endpoint:** `POST /admin/cities`
```json
{
  "name": "San Francisco",
  "state": "CA",
  "country": "USA"
}
```

**Update City:**
**Endpoint:** `PATCH /admin/cities/:id`

**Delete City:**
**Endpoint:** `DELETE /admin/cities/:id`

---

## Common APIs

### Get Categories

**Endpoint:** `GET /categories`

**Auth:** Not required

**Response (200):**
```json
{
  "categories": [
    {
      "id": "category_id",
      "name": "Technology",
      "slug": "technology",
      "icon": "https://example.com/icon.svg",
      "eventCount": 25
    }
  ]
}
```

---

### Get Cities

**Endpoint:** `GET /cities`

**Auth:** Not required

**Response (200):**
```json
{
  "cities": [
    {
      "id": "city_id",
      "name": "San Francisco",
      "state": "CA",
      "country": "USA",
      "eventCount": 30
    }
  ]
}
```

---

### Upload Event Image

**Endpoint:** `POST /upload/event-image`

**Auth:** Required

**Request:** FormData with `file` field

**Response (200):**
```json
{
  "url": "https://cloudinary.com/image.jpg",
  "publicId": "events/abc123",
  "format": "jpg",
  "width": 1920,
  "height": 1080
}
```

---

## WebSocket Integration

### Connection

```javascript
import io from 'socket.io-client';

const socket = io('ws://localhost:3001/events', {
  auth: {
    token: localStorage.getItem('token')
  }
});

socket.on('connect', () => {
  console.log('Connected to WebSocket');
});
```

### Subscribe to Event

```javascript
socket.emit('subscribe', { 
  eventId: 'event_id' 
});

socket.on('ticket:availability', (data) => {
  // Update ticket availability in UI
  // data: { eventId, ticketTypeId, available, change }
});

socket.on('booking:created', (data) => {
  // Show notification
  // data: { eventId, bookingId, quantity }
});

socket.on('event:updated', (data) => {
  // Refresh event details
  // data: { eventId, changes }
});
```

### Unsubscribe

```javascript
socket.emit('unsubscribe', { 
  eventId: 'event_id' 
});
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Not logged in |
| 403 | Forbidden | No permission |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 500 | Server Error | Backend error |

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### Frontend Error Handling

```javascript
try {
  const response = await fetch('/api/events', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  const data = await response.json();
  return data;
} catch (error) {
  console.error('API Error:', error.message);
  // Show error to user
}
```

---

## Quick Reference

### Authentication Required Endpoints

**User:**
- `GET /auth/me`
- `PATCH /auth/profile`
- `PATCH /auth/password`
- `POST /bookings/hold`
- `GET /bookings`
- `GET /tickets`
- `GET /notifications`

**Organizer:**
- `POST /events`
- `PATCH /events/:id`
- `POST /events/:eventId/ticket-types`
- `GET /bookings/event/:eventId`
- `GET /organizer/analytics/revenue`

**Admin:**
- `GET /admin/users`
- `POST /admin/users/create-organizer`
- `GET /admin/statistics`
- `POST /admin/categories`

### Public Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `GET /events`
- `GET /events/:id`
- `GET /categories`
- `GET /cities`
- `POST /contact`

---

## Testing

Use the provided test scripts to verify API functionality:

```bash
./test-admin-apis.sh
./test-organizer-apis.sh
./test-user-apis.sh
```

---

**Frontend Integration Guide Complete!** ✅

**Last Updated:** December 28, 2025  
**All 40 API endpoints documented and ready for integration** 🚀
