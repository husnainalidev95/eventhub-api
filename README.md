# 🎟️ EventHub API

**A complete, production-ready event management and ticketing platform backend.**

EventHub API is a robust backend service that powers event discovery, ticket booking, and payment processing. It provides a comprehensive solution for event organizers to create and manage events, and for users to discover, book, and purchase tickets seamlessly.

## 🌟 What EventHub Does

EventHub is a full-featured platform that connects event organizers with attendees. Organizers can create events, set up ticket types, manage bookings, and track analytics. Attendees can browse events, book tickets, receive digital tickets, and manage their bookings—all in one place.

### For Event Organizers
- Create and manage events with multiple ticket types
- Track bookings and sales in real-time
- Validate tickets at event entry
- View detailed analytics and revenue reports
- Manage event status (draft, active, cancelled)
- Duplicate events for recurring series
- Feature events for better visibility

### For Attendees
- Browse events by category, city, date, and price
- Book tickets with secure payment processing
- Receive digital tickets with QR codes via email
- Manage bookings and view ticket history
- Get notifications about event updates and cancellations
- Cancel bookings and receive automatic refunds

### For Administrators
- Manage all users and their roles
- Oversee all events on the platform
- View platform-wide statistics and analytics
- Manage categories and cities
- Create organizer accounts
- Monitor platform health and activity

## ✨ Key Features

### Event Management
- Create events with rich descriptions, images, and venue details
- Multiple ticket types per event (General, VIP, Early Bird, etc.)
- Event status management (Draft, Active, Cancelled, Completed)
- Featured events for better discoverability
- Event duplication for recurring series
- Real-time availability updates

### Smart Booking System
- 10-minute seat holds to prevent double bookings
- Secure payment processing with Stripe
- Automatic ticket generation with QR codes
- Email confirmations and ticket delivery
- Booking cancellation with automatic refunds
- Real-time booking notifications

### User Experience
- User profiles with customizable information
- Password management and email verification
- Booking history and ticket management
- In-app notifications for important updates
- Contact form for customer support
- Public organizer profiles with event statistics

### Organizer Tools
- Complete event analytics (revenue, bookings, attendance)
- Ticket validation at event entry
- Bulk ticket validation for faster check-ins
- Resend ticket emails to attendees
- Booking management per event
- Manual refund processing

### Admin Dashboard
- User management (create, update, delete, activate/deactivate)
- Event oversight with detailed statistics
- Platform-wide analytics and insights
- Category and city management
- Role management (User, Organizer, Admin)
- Comprehensive statistics dashboard

### Real-Time Features
- Live ticket availability updates
- Instant booking notifications
- Event update broadcasts
- WebSocket-based real-time communication

## 🎯 Who Can Use EventHub

**Event Organizers** - Host conferences, concerts, workshops, or any ticketed events. Manage your events, track sales, and validate tickets at entry.

**Attendees** - Browse events, book tickets, and receive digital tickets instantly. Manage your bookings and get notified about important updates.

**Administrators** - Manage the platform, oversee users and events, and monitor platform activity with comprehensive analytics.

## 🚀 Getting Started

### Quick Setup (5 Minutes)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   - Copy `.env.example` to `.env`
   - Add your service credentials (database, Redis, Stripe, etc.)

3. **Setup database**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

4. **Start the server**
   ```bash
   npm run start:dev
   ```

5. **Access the API**
   - API: http://localhost:3001/api
   - Documentation: http://localhost:3001/api/docs

That's it! Your EventHub API is running.

## 📚 Documentation

- **API Documentation** - Interactive Swagger docs at `/api/docs`
- **Frontend Integration Guide** - See `FE_INTEGRATION_PLAN.md` for complete API reference
- **Technical Documentation** - See `PROJECT_DOCUMENTATION.md` for architecture details

## 🎓 Required Services

EventHub uses several external services that you'll need to set up:

1. **PostgreSQL Database** - We recommend Neon.tech (free tier available)
2. **Redis** - For seat holds and caching (Upstash recommended, free tier available)
3. **Stripe** - For payment processing (test mode available)
4. **Cloudinary** - For image storage (free tier available)
5. **Resend** - For transactional emails (free tier: 100 emails/day)

Detailed setup instructions are available in the project documentation.

## 🎉 What's Included

A **production-ready backend** with:
- ✅ Complete authentication system
- ✅ Event management with multiple ticket types
- ✅ Smart booking system with seat holds
- ✅ Secure payment processing
- ✅ Digital ticket generation with QR codes
- ✅ Email notifications and confirmations
- ✅ Real-time updates via WebSocket
- ✅ Background job processing
- ✅ Comprehensive admin dashboard
- ✅ Analytics and reporting
- ✅ User notifications system
- ✅ Contact form support
- ✅ Category and city management
- ✅ Interactive API documentation

## 📊 Project Status

**All Features Complete!** ✅

All 9 phases of development have been completed:
- ✅ Phase 1: User Profile & Common Features
- ✅ Phase 2: Ticket Type Management
- ✅ Phase 3: Admin Dashboard
- ✅ Phase 4: Email Verification & Password Reset
- ✅ Phase 5: Organizer Tools
- ✅ Phase 6: User Experience (Contact, Notifications, Organizer Profiles)
- ✅ Phase 7: Analytics & Statistics
- ✅ Phase 8: Event Utilities (Duplicate, Featured)
- ✅ Phase 9: Category & City Management

**40 API endpoints implemented and tested** 🎉

## 🧪 Testing

Comprehensive test scripts are available for all features:
- `test-admin-apis.sh` - Test all admin endpoints
- `test-organizer-apis.sh` - Test all organizer endpoints
- `test-user-apis.sh` - Test all user endpoints

Run any test script to verify functionality:
```bash
./test-admin-apis.sh
./test-organizer-apis.sh
./test-user-apis.sh
```

## 🛠️ Common Commands

```bash
# Development
npm run start:dev          # Start development server
npm run build              # Build for production
npm run start:prod         # Start production server

# Database
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run database migrations
npm run prisma:studio      # Open database GUI

# Testing
./test-admin-apis.sh       # Test admin APIs
./test-organizer-apis.sh   # Test organizer APIs
./test-user-apis.sh        # Test user APIs
```

## 🌐 Important URLs

When running locally:
- **API Base**: http://localhost:3001/api
- **API Documentation**: http://localhost:3001/api/docs
- **WebSocket**: ws://localhost:3001/events
- **Database GUI**: http://localhost:5555 (via Prisma Studio)

## 💡 Need Help?

- Check the **API Documentation** at `/api/docs` for interactive testing
- Review **FE_INTEGRATION_PLAN.md** for frontend integration guide
- See **PROJECT_DOCUMENTATION.md** for technical architecture details
- Check server logs for detailed error messages

## 🎯 What's Next?

The EventHub backend is **complete and production-ready**. You can now:

1. **Connect your frontend** - Use the integration guide to connect your React/Next.js/Vue app
2. **Deploy to production** - Deploy to Railway, Vercel, or your preferred hosting
3. **Customize features** - Add your own customizations and enhancements
4. **Scale as needed** - The architecture supports horizontal scaling

## 📝 License

This project is open source and available for use in your projects.

---

**Built with ❤️ for event organizers and attendees everywhere.**

**Star this repo if it helped you!** ⭐
