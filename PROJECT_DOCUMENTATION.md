# EventHub API - Technical Documentation

**Complete technical documentation for EventHub API backend**

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [Repository Pattern](#repository-pattern)
5. [API Endpoints](#api-endpoints)
6. [Authentication & Authorization](#authentication--authorization)
7. [Payment Processing](#payment-processing)
8. [Real-Time Features](#real-time-features)
9. [Background Jobs](#background-jobs)
10. [Email System](#email-system)
11. [File Upload](#file-upload)
12. [Testing](#testing)
13. [Deployment](#deployment)

---

## Architecture Overview

EventHub API is built using **NestJS**, a progressive Node.js framework that provides a scalable and maintainable architecture. The application follows a **modular architecture** with clear separation of concerns.

### Core Principles

1. **Repository Pattern** - Data access layer abstraction for ORM independence
2. **Dependency Injection** - Loose coupling and easy testing
3. **Modular Design** - Feature-based modules for better organization
4. **Type Safety** - Full TypeScript implementation
5. **RESTful APIs** - Standard HTTP methods and status codes
6. **WebSocket Support** - Real-time bidirectional communication

### Project Structure

```
src/
├── main.ts                 # Application entry point
├── app.module.ts           # Root module
├── auth/                   # Authentication module
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── guards/            # JWT and role guards
│   ├── strategies/         # JWT strategy
│   └── dto/               # Data transfer objects
├── events/                 # Events module
│   ├── events.controller.ts
│   ├── events.service.ts
│   ├── events.repository.ts
│   ├── events.gateway.ts  # WebSocket gateway
│   └── dto/
├── bookings/              # Bookings module
│   ├── bookings.controller.ts
│   ├── bookings.service.ts
│   ├── bookings.repository.ts
│   └── dto/
├── tickets/               # Tickets module
│   ├── tickets.controller.ts
│   ├── tickets.service.ts
│   └── dto/
├── payment/               # Payment module
│   ├── payment.controller.ts
│   ├── payment.service.ts
│   └── dto/
├── admin/                 # Admin dashboard module
│   ├── admin.controller.ts
│   ├── admin.service.ts
│   ├── admin-categories.controller.ts
│   ├── admin-categories.service.ts
│   ├── admin-cities.controller.ts
│   ├── admin-cities.service.ts
│   └── dto/
├── organizer/             # Organizer module
│   ├── organizer.controller.ts
│   ├── organizer.service.ts
│   └── dto/
├── notifications/         # Notifications module
│   ├── notifications.controller.ts
│   ├── notifications.service.ts
│   └── dto/
├── contact/               # Contact form module
│   ├── contact.controller.ts
│   ├── contact.service.ts
│   └── dto/
├── common/                # Common utilities
│   ├── common.controller.ts
│   └── repositories/      # Base repository pattern
├── email/                 # Email service
│   ├── email.service.ts
│   └── templates/
├── upload/                # File upload service
│   ├── upload.controller.ts
│   └── upload.service.ts
├── queues/                # Background jobs
│   ├── queues.module.ts
│   ├── scheduled-jobs.service.ts
│   └── processors/
├── prisma/                # Database
│   └── prisma.service.ts
└── redis/                 # Redis cache
    └── redis.service.ts
```

---

## Technology Stack

### Core Framework
- **NestJS 10+** - Progressive Node.js framework
- **TypeScript 5+** - Type-safe development
- **Node.js 18+** - Runtime environment

### Database & ORM
- **PostgreSQL** - Primary database (Neon.tech)
- **Prisma ORM** - Database toolkit and ORM
- **Redis** - Caching and seat holds (Upstash)

### Authentication
- **JWT** - JSON Web Tokens for authentication
- **bcrypt** - Password hashing
- **Passport** - Authentication middleware

### Payment Processing
- **Stripe** - Payment processing platform
- **Stripe Webhooks** - Payment event handling

### Real-Time Communication
- **Socket.io** - WebSocket library for real-time updates

### Background Jobs
- **BullMQ** - Premium queue package for Node.js
- **Redis** - Queue backend

### File Storage
- **Cloudinary** - Image and video management

### Email Service
- **Resend** - Modern email API for developers

### API Documentation
- **Swagger/OpenAPI** - Interactive API documentation

---

## Database Schema

### Core Models

#### User
```prisma
model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  password      String
  role          UserRole  @default(USER)
  avatar        String?
  phone         String?
  companyName   String?
  description   String?
  website       String?
  logo          String?
  emailVerified Boolean   @default(false)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  events        Event[]
  bookings      Booking[]
  tickets       Ticket[]
  notifications Notification[]
}
```

#### Event
```prisma
model Event {
  id          String      @id @default(cuid())
  title       String
  description String
  date        DateTime
  time        String
  venue       String
  address     String
  categoryId  String
  cityId      String
  image       String?
  status      EventStatus @default(DRAFT)
  featured    Boolean     @default(false)
  organizerId String
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  organizer   User        @relation(fields: [organizerId], references: [id])
  categoryRef Category    @relation("Category", fields: [categoryId], references: [id])
  cityRef     City        @relation("City", fields: [cityId], references: [id])
  ticketTypes TicketType[]
  bookings    Booking[]
  tickets     Ticket[]
}
```

#### Category
```prisma
model Category {
  id          String   @id @default(cuid())
  name        String   @unique
  slug        String   @unique
  icon        String?
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  events      Event[]
}
```

#### City
```prisma
model City {
  id        String   @id @default(cuid())
  name      String
  state     String?
  country   String   @default("USA")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  events    Event[]
  
  @@unique([name, state, country])
}
```

#### Booking
```prisma
model Booking {
  id             String        @id @default(cuid())
  userId         String
  eventId        String
  ticketTypeId   String
  quantity       Int
  totalAmount    Float
  status         BookingStatus @default(PENDING)
  bookingCode    String        @unique
  holdId         String?
  paymentId      String?
  paymentStatus  PaymentStatus @default(PENDING)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  
  user           User          @relation(fields: [userId], references: [id])
  event          Event         @relation(fields: [eventId], references: [id])
  ticketType     TicketType    @relation(fields: [ticketTypeId], references: [id])
  tickets        Ticket[]
}
```

#### Ticket
```prisma
model Ticket {
  id           String       @id @default(cuid())
  bookingId    String
  userId       String
  eventId      String
  ticketTypeId String
  ticketCode   String       @unique
  qrCodeData   String
  seatNumber   String?
  status       TicketStatus @default(VALID)
  usedAt       DateTime?
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  
  booking      Booking      @relation(fields: [bookingId], references: [id])
  user         User         @relation(fields: [userId], references: [id])
  event        Event        @relation(fields: [eventId], references: [id])
  ticketType   TicketType   @relation(fields: [ticketTypeId], references: [id])
}
```

#### Notification
```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String
  title     String
  message   String
  data      Json?
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
  
  user      User     @relation(fields: [userId], references: [id])
}
```

### Enums

```prisma
enum UserRole {
  USER
  ORGANIZER
  ADMIN
}

enum EventStatus {
  DRAFT
  ACTIVE
  CANCELLED
  COMPLETED
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
}

enum TicketStatus {
  VALID
  USED
  CANCELLED
  EXPIRED
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}
```

---

## Repository Pattern

EventHub uses the **Repository Pattern** to abstract data access logic from business logic. This provides:

1. **ORM Independence** - Easy migration from Prisma to other ORMs
2. **Better Testability** - Mock repositories for unit tests
3. **Single Responsibility** - Services handle logic, repositories handle data
4. **Transaction Support** - Built-in transaction context

### Base Repository

```typescript
export abstract class BaseRepository<T> implements IBaseRepository<T> {
  constructor(protected readonly prisma: PrismaService) {}

  protected getPrismaClient(context?: WithPrisma<PrismaService>): PrismaService {
    return (context?.trxPrisma as PrismaService) ?? this.prisma;
  }

  abstract findById(id: string, context?: WithPrisma<PrismaService>): Promise<T | null>;
  abstract findAll(filter?: any, context?: WithPrisma<PrismaService>): Promise<T[]>;
  abstract create(data: any, context?: WithPrisma<PrismaService>): Promise<T>;
  abstract update(id: string, data: any, context?: WithPrisma<PrismaService>): Promise<T>;
  abstract delete(id: string, context?: WithPrisma<PrismaService>): Promise<T>;
}
```

### Repositories Implemented

1. **BookingsRepository** - Booking CRUD, holds management
2. **TicketTypesRepository** - Ticket type management, availability tracking
3. **TicketsRepository** - Ticket CRUD, validation, status filters
4. **EventsRepository** - Event CRUD with search/filter capabilities
5. **UsersRepository** - User management and authentication queries
6. **CategoriesRepository** - Category CRUD operations
7. **CitiesRepository** - City CRUD operations

---

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login user | No |
| GET | `/auth/me` | Get current user | Yes |
| PATCH | `/auth/profile` | Update profile | Yes |
| PATCH | `/auth/password` | Change password | Yes |
| POST | `/auth/send-verification` | Send verification email | Yes |
| POST | `/auth/verify-email` | Verify email with token | No |
| POST | `/auth/forgot-password` | Request password reset | No |
| POST | `/auth/reset-password` | Reset password with token | No |

### Event Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/events` | List all events | No |
| GET | `/events/:id` | Get event details | No |
| POST | `/events` | Create event | Organizer |
| PUT | `/events/:id` | Update event | Organizer |
| DELETE | `/events/:id` | Delete event | Organizer |
| PATCH | `/events/:id/publish` | Publish event | Organizer |
| PATCH | `/events/:id/unpublish` | Unpublish event | Organizer |
| PATCH | `/events/:id/cancel` | Cancel event | Organizer |
| GET | `/events/:id/analytics` | Get event analytics | Organizer |
| POST | `/events/:id/duplicate` | Duplicate event | Organizer |
| PATCH | `/events/:id/feature` | Toggle featured status | Organizer |

### Ticket Type Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/events/:eventId/ticket-types` | Create ticket type | Organizer |
| GET | `/events/:eventId/ticket-types` | Get ticket types | No |
| PATCH | `/events/:eventId/ticket-types/:id` | Update ticket type | Organizer |
| DELETE | `/events/:eventId/ticket-types/:id` | Delete ticket type | Organizer |

### Booking Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/bookings/hold` | Create seat hold | Yes |
| GET | `/bookings/hold/:holdId` | Get hold details | Yes |
| DELETE | `/bookings/hold/:holdId` | Release hold | Yes |
| POST | `/bookings` | Create booking | Yes |
| GET | `/bookings` | Get user bookings | Yes |
| GET | `/bookings/:id` | Get booking details | Yes |
| DELETE | `/bookings/:id` | Cancel booking | Yes |
| GET | `/bookings/event/:eventId` | Get event bookings | Organizer |
| PATCH | `/bookings/:id/status` | Update booking status | Organizer |
| POST | `/bookings/:id/refund` | Process refund | Organizer |

### Ticket Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/tickets` | Get user tickets | Yes |
| GET | `/tickets/:code` | Get ticket by code | Yes |
| POST | `/tickets/:code/validate` | Validate ticket | Organizer |
| GET | `/tickets/event/:eventId` | Get event tickets | Organizer |
| POST | `/tickets/event/:eventId/bulk-validate` | Bulk validate tickets | Organizer |
| POST | `/tickets/:code/resend` | Resend ticket email | Organizer |

### Payment Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/payment/create-intent` | Create payment intent | Yes |
| POST | `/payment/webhook` | Stripe webhook | No (Stripe) |

### Admin Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/admin/users` | Get all users | Admin |
| GET | `/admin/users/:id` | Get user details | Admin |
| POST | `/admin/users/create-organizer` | Create organizer | Admin |
| PATCH | `/admin/users/:id/role` | Update user role | Admin |
| PATCH | `/admin/users/:id/status` | Update user status | Admin |
| DELETE | `/admin/users/:id` | Delete user | Admin |
| GET | `/admin/events` | Get all events | Admin |
| GET | `/admin/statistics` | Get platform statistics | Admin |
| GET | `/admin/categories` | Get all categories | Admin |
| POST | `/admin/categories` | Create category | Admin |
| PATCH | `/admin/categories/:id` | Update category | Admin |
| DELETE | `/admin/categories/:id` | Delete category | Admin |
| GET | `/admin/cities` | Get all cities | Admin |
| POST | `/admin/cities` | Create city | Admin |
| PATCH | `/admin/cities/:id` | Update city | Admin |
| DELETE | `/admin/cities/:id` | Delete city | Admin |

### Organizer Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| PATCH | `/organizer/profile` | Update organizer profile | Organizer |
| GET | `/organizer/:id/public` | Get public organizer profile | No |
| GET | `/organizer/analytics/revenue` | Get revenue analytics | Organizer |
| GET | `/organizer/analytics/bookings` | Get booking analytics | Organizer |

### Common Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/categories` | Get all categories | No |
| GET | `/cities` | Get all cities | No |

### Other Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/upload/event-image` | Upload event image | Yes |
| POST | `/contact` | Submit contact form | No |
| GET | `/notifications` | Get user notifications | Yes |
| PATCH | `/notifications/:id/read` | Mark notification as read | Yes |
| PATCH | `/notifications/read-all` | Mark all as read | Yes |

---

## Authentication & Authorization

### JWT Authentication

EventHub uses **JWT (JSON Web Tokens)** for authentication. Tokens are issued on login/register and must be included in the `Authorization` header for protected routes.

```typescript
Authorization: Bearer <token>
```

### Role-Based Access Control (RBAC)

Three user roles with different permissions:

1. **USER** - Can browse events, book tickets, manage own bookings
2. **ORGANIZER** - All USER permissions + create/manage events, view analytics
3. **ADMIN** - All permissions + user management, platform statistics

### Guards

- **JwtAuthGuard** - Validates JWT token
- **RolesGuard** - Checks user role permissions

---

## Payment Processing

### Stripe Integration

EventHub uses **Stripe** for payment processing:

1. **Payment Intent Creation** - Backend creates payment intent with hold details
2. **Frontend Confirmation** - User confirms payment using Stripe.js
3. **Webhook Processing** - Stripe sends webhook on successful payment
4. **Booking Creation** - Backend creates booking and tickets automatically
5. **Refund Processing** - Automatic refunds on cancellation

### Payment Flow

```
User → Create Hold → Create Payment Intent → Confirm Payment (Stripe.js) 
→ Webhook → Create Booking → Generate Tickets → Send Email
```

---

## Real-Time Features

### WebSocket Gateway

EventHub uses **Socket.io** for real-time communication:

- **Namespace**: `/events`
- **Authentication**: JWT token in connection auth
- **Rooms**: Event-based rooms for targeted updates

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `subscribe` | Client → Server | Subscribe to event updates |
| `unsubscribe` | Client → Server | Unsubscribe from event |
| `ticket:availability` | Server → Client | Ticket availability changed |
| `booking:created` | Server → Client | New booking created |
| `booking:cancelled` | Server → Client | Booking cancelled |
| `event:updated` | Server → Client | Event details changed |
| `event:cancelled` | Server → Client | Event cancelled |

---

## Background Jobs

### BullMQ Integration

EventHub uses **BullMQ** for background job processing:

1. **Email Queue** - Processes booking confirmations, tickets, cancellations
2. **Scheduled Jobs** - Event reminders, analytics processing, hold cleanup

### Job Processors

- **EmailProcessor** - Handles email sending with retry logic (3 attempts)
- **ScheduledJobsService** - Runs cron jobs:
  - Event reminders (daily at 9 AM)
  - Analytics processing (hourly)
  - Hold cleanup (every 5 minutes)

---

## Email System

### Resend Integration

EventHub uses **Resend** for transactional emails:

- Booking confirmations
- Ticket delivery with QR codes
- Cancellation notifications
- Event reminders
- Email verification
- Password reset
- Contact form notifications

### Email Templates

All emails use HTML templates with:
- Branded styling
- Responsive design
- QR code integration
- Clear call-to-actions

---

## File Upload

### Cloudinary Integration

EventHub uses **Cloudinary** for image storage:

- Event images
- User avatars
- Organizer logos
- Automatic optimization
- CDN delivery

---

## Testing

### Test Scripts

Three comprehensive test scripts:

1. **test-admin-apis.sh** - Tests all admin endpoints
2. **test-organizer-apis.sh** - Tests all organizer endpoints
3. **test-user-apis.sh** - Tests all user endpoints

### Running Tests

```bash
./test-admin-apis.sh
./test-organizer-apis.sh
./test-user-apis.sh
```

---

## Deployment

### Environment Variables

Required environment variables:

```env
# Database
DATABASE_URL=

# Redis
REDIS_URL=

# Authentication
JWT_SECRET=

# Email
RESEND_API_KEY=

# Payment
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# File Upload
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Application
PORT=3001
FRONTEND_URL=http://localhost:3000
ADMIN_EMAIL=admin@eventhub.com
```

### Production Checklist

- [ ] Set up production database
- [ ] Configure Redis for production
- [ ] Set up Stripe production account
- [ ] Configure Cloudinary production account
- [ ] Set up Resend production account
- [ ] Configure environment variables
- [ ] Set up SSL certificates
- [ ] Configure CORS for production domain
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy

---

## Implementation Status

**All Phases Complete!** ✅

- ✅ Phase 1: User Profile & Common Features
- ✅ Phase 2: Ticket Type Management
- ✅ Phase 3: Admin Dashboard
- ✅ Phase 4: Email Verification & Password Reset
- ✅ Phase 5: Organizer Tools
- ✅ Phase 6: User Experience
- ✅ Phase 7: Analytics & Statistics
- ✅ Phase 8: Event Utilities
- ✅ Phase 9: Category & City Management

**40 API endpoints implemented and tested** 🎉

---

**Last Updated:** December 28, 2025  
**Status:** Production Ready 🚀
