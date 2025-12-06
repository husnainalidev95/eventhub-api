import { ApiProperty } from '@nestjs/swagger';

export class PaymentIntentResponseDto {
  @ApiProperty({
    description: 'Stripe client secret for frontend payment processing',
    example: 'pi_xxx_secret_xxx',
  })
  clientSecret: string;

  @ApiProperty({
    description: 'Payment intent ID',
    example: 'pi_xxx',
  })
  paymentIntentId: string;

  @ApiProperty({
    description: 'Amount in cents',
    example: 5000,
  })
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'usd',
  })
  currency: string;
}
