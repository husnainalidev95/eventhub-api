import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { ContactFormDto } from './dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async submitContactForm(contactFormDto: ContactFormDto): Promise<{ message: string }> {
    try {
      // Get admin email from environment variables
      const adminEmail = this.configService.get<string>('ADMIN_EMAIL') || 'admin@eventhub.com';

      // Send notification to admin
      await this.emailService.sendContactFormAdminNotification(adminEmail, {
        name: contactFormDto.name,
        email: contactFormDto.email,
        subject: contactFormDto.subject,
        message: contactFormDto.message,
      });

      // Send auto-reply to user
      await this.emailService.sendContactFormAutoReply(contactFormDto.email, {
        name: contactFormDto.name,
        subject: contactFormDto.subject,
      });

      this.logger.log(`Contact form submitted by ${contactFormDto.name} (${contactFormDto.email})`);

      return {
        message:
          'Thank you for contacting us! We have received your message and will get back to you soon.',
      };
    } catch (error) {
      this.logger.error('Error processing contact form', error);
      throw error;
    }
  }
}
