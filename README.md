# 🎟️ EventHub API (Backend)

**EventHub API** is the backend service for the Event Booking & Management Platform.  
Built with **NestJS 10**, **Prisma**, and **PostgreSQL**.  

It provides REST APIs + WebSocket updates for events, bookings, payments, uploads, and notifications.

---

## 🚀 Features

- **Authentication & Roles**  
  JWT sessions (for NextAuth client). Roles: `ATTENDEE`, `ORGANIZER`, `ADMIN`.

- **Event Management**  
  CRUD events, ticket types, categories, venues, image uploads.

- **Bookings**  
  Create booking holds with DB transactions, prevent overselling, expire holds via TTL.

- **Payments**  
  Stripe Checkout integration + webhook handling.  
  Idempotency strategies to avoid double charges.

- **Uploads**  
  Signed URLs for direct-to-S3 image upload.

- **Emails**  
  AWS SES for booking confirmations, reminders, and failure/refund notices.

- **Realtime**  
  WebSocket seat count updates on event pages.

- **Admin Utilities**  
  Minimal feature flags, user role management, SES template preview.

- **OpenAPI 3.1**  
  Exported spec for frontend codegen.

---

## 🛠️ Tech Stack

- [NestJS 10](https://nestjs.com/) (REST + WebSockets)
- [Prisma](https://www.prisma.io/) ORM
- [PostgreSQL 14+](https://www.postgresql.org/)
- [Redis](https://redis.io/) (rate limits, booking holds TTL)
- [Stripe](https://stripe.com/) (payments)
- [AWS S3](https://aws.amazon.com/s3/) (file storage)
- [AWS SES](https://aws.amazon.com/ses/) (emails)
- [AWS SQS](https://aws.amazon.com/sqs/) (async jobs)
- [OpenTelemetry](https://opentelemetry.io/) + [Sentry](https://sentry.io/) (observability)
- [Jest](https://jestjs.io/) (testing)

---

## 📂 Project Structure

src/
app.module.ts
common/ # guards, pipes, interceptors
prisma/ # prisma service/module
auth/ # login, jwt strategy
users/ # user management
events/ # events CRUD
tickets/ # ticket types
bookings/ # booking holds, capacity logic
payments/ # Stripe integration
uploads/ # signed S3 uploads
webhooks/ # Stripe webhooks
notifications/ # SES + async jobs
ws/ # WebSocket gateway
prisma/
schema.prisma # DB schema
seed.ts # seed data
openapi.yaml # generated API spec

yaml
Copy code

---

## ⚙️ Setup

### Prerequisites
- Node.js 20+
- pnpm (recommended) or npm
- PostgreSQL 14+ (local or managed)
- Redis (local, Upstash, or ElastiCache)
- Stripe account (test mode works)

### Environment Variables

Create `.env`:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/eventhub
JWT_SECRET=replace-me
STRIPE_SECRET=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
AWS_REGION=eu-central-1
S3_BUCKET=eventhub-images-dev
SES_SENDER=noreply@yourdomain.com
REDIS_URL=redis://localhost:6379
Install & Run
bash
Copy code
pnpm install
pnpm prisma migrate dev
pnpm prisma db seed
pnpm start:dev
API → http://localhost:4000
Swagger → http://localhost:4000/docs

📜 Scripts
bash
Copy code
pnpm start:dev       # run dev server (watch mode)
pnpm build           # compile TypeScript
pnpm start:prod      # run compiled code
pnpm prisma:dev      # run migrations + seed
pnpm prisma:deploy   # deploy migrations (CI/CD)
pnpm test            # run Jest unit tests
pnpm test:e2e        # e2e tests (supertest)
🧪 Testing
Unit: services & guards (Jest)

E2E: critical booking + Stripe webhook flow

Contract: Stripe webhook signature fixtures

Load: k6 scripts for booking bursts

🚀 Deployment
Infrastructure:
AWS Lambda + API Gateway
Aurora PostgreSQL Serverless v2
Redis (ElastiCache or Upstash)
S3 (images)
SES (emails)
SQS (async jobs)

IaC: SST or Terraform

CI/CD: GitHub Actions

Lint + test on PR

Deploy on tag release

prisma migrate deploy with rollback strategy

📖 Documentation
Prisma Schema

OpenAPI Spec

Architecture Docs

📌 Roadmap
 Add promo codes

 Multi-currency support

 Organizer payout reports

🧑‍💻 Author
Built by Husnain Ali.
Backend API for EventHub — an open-source event booking platform.
