export const cancellationTemplate = (data: {
  userName: string;
  bookingCode: string;
  eventTitle: string;
  refundAmount: number;
}): string => `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background-color: #EF4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
      .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
      .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Booking Cancelled</h1>
      </div>
      <div class="content">
        <p>Hi ${data.userName},</p>
        <p>Your booking <strong>${data.bookingCode}</strong> for <strong>${data.eventTitle}</strong> has been cancelled.</p>
        
        <div style="background-color: #DBEAFE; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Refund Amount:</strong> $${data.refundAmount.toFixed(2)}</p>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #6B7280;">The refund will be processed within 5-7 business days.</p>
        </div>
        
        <p>We're sorry to see you go! If you have any questions or concerns, please don't hesitate to contact our support team.</p>
      </div>
      <div class="footer">
        <p>EventHub Team</p>
      </div>
    </div>
  </body>
</html>
`;
