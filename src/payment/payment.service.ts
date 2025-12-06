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
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private stripe: Stripe | null = null;
  private webhookSecret: string | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
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

    // Get ticket type to calculate amount
    const ticketType = await this.prisma.ticketType.findUnique({
      where: { id: holdData.ticketTypeId },
      include: { event: true },
    });

    if (!ticketType) {
      throw new BadRequestException('Ticket type not found');
    }

    // Calculate amount in cents
    const amountInCents = Math.round(ticketType.price * holdData.quantity * 100);

    try {
      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        metadata: {
          holdId,
          userId,
          eventId: ticketType.eventId,
          ticketTypeId: ticketType.id,
          quantity: holdData.quantity.toString(),
          eventTitle: ticketType.event.title,
          ticketTypeName: ticketType.name,
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
    const { holdId, userId, ticketTypeId, quantity } = paymentIntent.metadata;

    this.logger.log(`Payment succeeded for hold ${holdId}, creating booking...`);

    try {
      // Verify hold still exists
      const holdData = await this.redisService.getHold(holdId);
      if (!holdData) {
        this.logger.error(`Hold ${holdId} not found or expired`);
        // TODO: Handle refund if needed
        return;
      }

      // Get ticket type
      const ticketType = await this.prisma.ticketType.findUnique({
        where: { id: ticketTypeId },
      });

      if (!ticketType || ticketType.available < parseInt(quantity)) {
        this.logger.error(`Insufficient tickets available for hold ${holdId}`);
        // TODO: Handle refund
        return;
      }

      // Create booking in transaction
      const booking = await this.prisma.$transaction(async (tx) => {
        // Generate unique booking code
        const bookingCode = `BK-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

        // Create booking
        const newBooking = await tx.booking.create({
          data: {
            userId,
            eventId: ticketType.eventId,
            ticketTypeId,
            quantity: parseInt(quantity),
            totalAmount: paymentIntent.amount / 100, // Convert cents to dollars
            bookingCode,
            holdId,
            paymentId: paymentIntent.id,
            paymentStatus: 'PAID',
            status: 'CONFIRMED',
          },
        });

        // Decrement available tickets
        await tx.ticketType.update({
          where: { id: ticketTypeId },
          data: {
            available: {
              decrement: parseInt(quantity),
            },
          },
        });

        // Generate tickets
        const tickets = [];
        for (let i = 0; i < parseInt(quantity); i++) {
          const ticketCode = `TIX-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
          const qrCodeData = JSON.stringify({
            bookingId: newBooking.id,
            ticketCode,
            ticketTypeId,
            eventId: ticketType.eventId,
            timestamp: new Date().toISOString(),
          });

          tickets.push({
            bookingId: newBooking.id,
            userId,
            eventId: ticketType.eventId,
            ticketTypeId,
            ticketCode,
            qrCodeData,
            status: 'VALID',
          });
        }

        await tx.ticket.createMany({ data: tickets });

        return newBooking;
      });

      // Release hold from Redis
      await this.redisService.releaseHold(holdId);

      this.logger.log(
        `Booking ${booking.bookingCode} created successfully for payment ${paymentIntent.id}`,
      );

      // Emit real-time updates
      this.eventsGateway.emitBookingCreated(userId, booking);
      
      const updatedTicketType = await this.prisma.ticketType.findUnique({
        where: { id: ticketTypeId },
      });
      this.eventsGateway.emitTicketAvailabilityUpdate(
        ticketType.eventId,
        ticketTypeId,
        updatedTicketType.available,
      );

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
