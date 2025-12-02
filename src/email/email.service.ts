import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  bookingConfirmationTemplate,
  ticketEmailTemplate,
  cancellationTemplate,
  eventReminderTemplate,
} from './templates';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not configured. Email sending will be disabled.');
      // Initialize with a dummy key to prevent errors, but don't use it
      this.resend = null;
    } else {
      this.resend = new Resend(apiKey);
    }
  }

  async sendBookingConfirmation(
    to: string,
    bookingData: {
      userName: string;
      bookingCode: string;
      eventTitle: string;
      eventDate: string;
      eventTime: string;
      eventVenue: string;
      eventCity: string;
      ticketType: string;
      quantity: number;
      totalAmount: number;
    },
  ) {
    if (!this.resend) {
      this.logger.warn('Email service not configured. Skipping booking confirmation email.');
      return null;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: 'EventHub <onboarding@resend.dev>',
        to,
        subject: `Booking Confirmed - ${bookingData.eventTitle}`,
        html: bookingConfirmationTemplate(bookingData),
      });

      if (error) {
        this.logger.error('Failed to send booking confirmation email', error);
        throw error;
      }

      this.logger.log(`Booking confirmation email sent to ${to}`);
      return data;
    } catch (error) {
      this.logger.error('Error sending booking confirmation email', error);
      throw error;
    }
  }

  async sendTicketEmail(
    to: string,
    ticketData: {
      userName: string;
      bookingCode: string;
      eventTitle: string;
      eventDate: string;
      eventTime: string;
      eventVenue: string;
      eventAddress: string;
      tickets: Array<{
        ticketCode: string;
        ticketType: string;
        qrCodeData: string;
      }>;
    },
  ) {
    if (!this.resend) {
      this.logger.warn('Email service not configured. Skipping ticket email.');
      return null;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: 'EventHub <onboarding@resend.dev>',
        to,
        subject: `Your Tickets - ${ticketData.eventTitle}`,
        html: ticketEmailTemplate(ticketData),
      });

      if (error) {
        this.logger.error('Failed to send ticket email', error);
        throw error;
      }

      this.logger.log(`Ticket email sent to ${to}`);
      return data;
    } catch (error) {
      this.logger.error('Error sending ticket email', error);
      throw error;
    }
  }

  async sendCancellationEmail(
    to: string,
    cancellationData: {
      userName: string;
      bookingCode: string;
      eventTitle: string;
      refundAmount: number;
    },
  ) {
    if (!this.resend) {
      this.logger.warn('Email service not configured. Skipping cancellation email.');
      return null;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: 'EventHub <onboarding@resend.dev>',
        to,
        subject: `Booking Cancelled - ${cancellationData.eventTitle}`,
        html: cancellationTemplate(cancellationData),
      });

      if (error) {
        this.logger.error('Failed to send cancellation email', error);
        throw error;
      }

      this.logger.log(`Cancellation email sent to ${to}`);
      return data;
    } catch (error) {
      this.logger.error('Error sending cancellation email', error);
      throw error;
    }
  }

  async sendEventReminder(
    to: string,
    reminderData: {
      userName: string;
      eventTitle: string;
      eventDate: string;
      eventTime: string;
      eventVenue: string;
      eventAddress: string;
      ticketCount: number;
    },
  ) {
    if (!this.resend) {
      this.logger.warn('Email service not configured. Skipping event reminder email.');
      return null;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: 'EventHub <onboarding@resend.dev>',
        to,
        subject: `Reminder: ${reminderData.eventTitle} Tomorrow!`,
        html: eventReminderTemplate(reminderData),
      });

      if (error) {
        this.logger.error('Failed to send event reminder email', error);
        throw error;
      }

      this.logger.log(`Event reminder email sent to ${to}`);
      return data;
    } catch (error) {
      this.logger.error('Error sending event reminder email', error);
      throw error;
    }
  }
}
