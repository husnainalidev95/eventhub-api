import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailService } from '../../email/email.service';

export interface BookingConfirmationEmailJob {
  email: string;
  data: {
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
  };
}

export interface TicketsEmailJob {
  email: string;
  data: {
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
  };
}

export interface CancellationEmailJob {
  email: string;
  data: {
    userName: string;
    bookingCode: string;
    eventTitle: string;
    refundAmount: number;
  };
}

export interface EventReminderEmailJob {
  email: string;
  data: {
    userName: string;
    eventTitle: string;
    eventDate: string;
    eventTime: string;
    eventVenue: string;
    eventAddress: string;
    ticketCount: number;
  };
}

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} of type ${job.name} completed successfully`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} of type ${job.name} failed: ${error.message}`);
  }

  @Process('booking-confirmation')
  async handleBookingConfirmation(job: Job<BookingConfirmationEmailJob>) {
    const { email, data } = job.data;
    this.logger.log(`Sending booking confirmation email to ${email}`);

    try {
      await this.emailService.sendBookingConfirmation(email, data);
      return { success: true, email };
    } catch (error) {
      this.logger.error(`Failed to send booking confirmation email: ${error.message}`);
      throw error; // Will trigger retry
    }
  }

  @Process('tickets')
  async handleTicketsEmail(job: Job<TicketsEmailJob>) {
    const { email, data } = job.data;
    this.logger.log(`Sending tickets email to ${email}`);

    try {
      await this.emailService.sendTicketEmail(email, data);
      return { success: true, email };
    } catch (error) {
      this.logger.error(`Failed to send tickets email: ${error.message}`);
      throw error;
    }
  }

  @Process('cancellation')
  async handleCancellationEmail(job: Job<CancellationEmailJob>) {
    const { email, data } = job.data;
    this.logger.log(`Sending cancellation email to ${email}`);

    try {
      await this.emailService.sendCancellationEmail(email, data);
      return { success: true, email };
    } catch (error) {
      this.logger.error(`Failed to send cancellation email: ${error.message}`);
      throw error;
    }
  }

  @Process('event-reminder')
  async handleEventReminderEmail(job: Job<EventReminderEmailJob>) {
    const { email, data } = job.data;
    this.logger.log(`Sending event reminder email to ${email}`);

    try {
      await this.emailService.sendEventReminder(email, data);
      return { success: true, email };
    } catch (error) {
      this.logger.error(`Failed to send event reminder email: ${error.message}`);
      throw error;
    }
  }
}
