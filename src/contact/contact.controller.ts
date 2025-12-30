import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { ContactFormDto } from './dto';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit contact form' })
  @ApiResponse({
    status: 200,
    description: 'Contact form submitted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example:
            'Thank you for contacting us! We have received your message and will get back to you soon.',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  async submitContactForm(@Body() contactFormDto: ContactFormDto) {
    return this.contactService.submitContactForm(contactFormDto);
  }
}
