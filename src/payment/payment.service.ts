import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { RedisService } from '../redis/redis.service';
import { EventsGateway } from '../events/events.gateway';
import { TicketTypesRepository } from '../bookings/ticket-types.repository';
import { BookingsRepository } from '../bookings/bookings.repository';
import { TicketsRepository } from '../bookings/tickets.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private stripe: Stripe | null = null;
  private webhookSecret: string | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly ticketTypesRepository: TicketTypesRepository,
    private readonly bookingsRepository: BookingsRepository,
    private readonly ticketsRepository: TicketsRepository,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (secretKey) {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2025-11-17.clover',
      });
      this.logger.log('✅ Stripe configured successfully');
    } else {
      this.logger.warn('⚠️  Stripe not configured. Payment features will be unavailable.');
    }
  }

  async createPaymentIntent(holdId: string, userId: string) {
    if (!this.stripe) {
      throw new InternalServerErrorException('Payment service is not configured');
    }

    // Get hold data from Redis
    const holdData = await this.redisService.getHold(holdId);
    if (!holdData) {
      throw new BadRequestException('Hold not found or expired');
    }

    // Verify hold ownership
    if (holdData.userId !== userId) {
      throw new BadRequestException('This hold does not belong to you');
    }

    // Use the total amount already calculated in the hold (stored in cents already in DB but in dollars in Redis)
    const amountInCents = Math.round(holdData.totalAmount * 100);

    // Build ticket items string for metadata
    const ticketItemsStr = JSON.stringify(
      holdData.tickets.map((t: any) => ({
        ticketTypeId: t.ticketTypeId,
        quantity: t.quantity,
        price: t.price,
      })),
    );

    try {
      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        metadata: {
          holdId,
          userId,
          eventId: holdData.eventId,
          ticketItems: ticketItemsStr, // Store multiple ticket types
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      this.logger.log(`Payment intent created: ${paymentIntent.id} for hold ${holdId}`);

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: amountInCents,
        currency: 'usd',
      };
    } catch (error) {
      this.logger.error('Failed to create payment intent:', error);
      throw new InternalServerErrorException('Failed to create payment intent');
    }
  }

  async handleWebhook(signature: string, rawBody: Buffer) {
    if (!this.stripe || !this.webhookSecret) {
      throw new InternalServerErrorException('Payment service is not configured');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch (error) {
      this.logger.error('Webhook signature verification failed:', error);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Webhook received: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const { holdId, userId, ticketItems } = paymentIntent.metadata;

    this.logger.log(`Payment succeeded for hold ${holdId}, creating booking...`);

    try {
      // Verify hold still exists
      const holdData = await this.redisService.getHold(holdId);
      if (!holdData) {
        this.logger.error(`Hold ${holdId} not found or expired`);
        // TODO: Handle refund if needed
        return;
      }

      // Parse ticket items from metadata
      const ticketItemsParsed = JSON.parse(ticketItems);

      // Validate all ticket types have sufficient availability
      for (const item of ticketItemsParsed) {
        const ticketType = await this.ticketTypesRepository.findById(item.ticketTypeId);
        if (!ticketType || ticketType.available < item.quantity) {
          this.logger.error(`Insufficient tickets available for ticket type ${item.ticketTypeId}`);
          // TODO: Handle refund
          return;
        }
      }

      // Create booking in transaction (one booking with multiple ticket types)
      const booking = await this.prisma.$transaction(async (tx) => {
        const context = { trxPrisma: tx };

        // Generate unique booking code
        const bookingCode = `BK-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

        // Get event ID from first ticket type
        const firstTicketType = await this.ticketTypesRepository.findById(
          ticketItemsParsed[0].ticketTypeId,
        );

        // For now, we'll create one booking record per ticket type
        // This maintains compatibility with the current schema
        const bookings = [];
        const allTickets = [];

        for (const item of ticketItemsParsed) {
          const ticketType = await this.ticketTypesRepository.findById(item.ticketTypeId);

          // Create booking for this ticket type
          const newBooking = await this.bookingsRepository.create(
            {
              user: { connect: { id: userId } },
              event: { connect: { id: firstTicketType.eventId } },
              ticketType: { connect: { id: item.ticketTypeId } },
              quantity: item.quantity,
              totalAmount: item.price * item.quantity,
              bookingCode: bookingCode, // Same booking code for all related bookings
              holdId,
              paymentId: paymentIntent.id,
              paymentStatus: 'PAID',
              status: 'CONFIRMED',
            },
            context,
          );

          bookings.push(newBooking);

          // Decrement available tickets
          await this.ticketTypesRepository.decrementAvailable(
            item.ticketTypeId,
            item.quantity,
            context,
          );

          // Generate tickets for this ticket type
          for (let i = 0; i < item.quantity; i++) {
            const ticketCode = `TIX-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
            const qrCodeData = JSON.stringify({
              bookingId: newBooking.id,
              ticketCode,
              ticketTypeId: item.ticketTypeId,
              eventId: firstTicketType.eventId,
              timestamp: new Date().toISOString(),
            });

            allTickets.push({
              bookingId: newBooking.id,
              userId,
              eventId: firstTicketType.eventId,
              ticketTypeId: item.ticketTypeId,
              ticketCode,
              qrCodeData,
              status: 'VALID',
            });
          }
        }

        await this.ticketsRepository.createMany(allTickets, context);

        return bookings[0]; // Return first booking for logging
      });

      // Release hold from Redis
      await this.redisService.releaseHold(holdId);

      this.logger.log(
        `Booking ${booking.bookingCode} created successfully for payment ${paymentIntent.id}`,
      );

      // Emit real-time updates for each ticket type
      this.eventsGateway.emitBookingCreated(userId, booking);

      for (const item of ticketItemsParsed) {
        const updatedTicketType = await this.ticketTypesRepository.findById(item.ticketTypeId);
        const ticketType = await this.ticketTypesRepository.findById(item.ticketTypeId);
        this.eventsGateway.emitTicketAvailabilityUpdate(
          ticketType.eventId,
          item.ticketTypeId,
          updatedTicketType.available,
        );
      }

      // TODO: Send confirmation and ticket emails via EmailService
    } catch (error) {
      this.logger.error('Failed to create booking after payment:', error);
      // TODO: Handle refund
    }
  }

  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
    const { holdId } = paymentIntent.metadata;

    this.logger.warn(`Payment failed for hold ${holdId}`);
    // Hold will expire naturally, no action needed
  }

  async createRefund(paymentIntentId: string, amount?: number) {
    if (!this.stripe) {
      throw new InternalServerErrorException('Payment service is not configured');
    }

    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount, // If not provided, refunds full amount
      });

      this.logger.log(`Refund created: ${refund.id} for payment ${paymentIntentId}`);
      return refund;
    } catch (error) {
      this.logger.error('Failed to create refund:', error);
      throw new InternalServerErrorException('Failed to process refund');
    }
  }
}
