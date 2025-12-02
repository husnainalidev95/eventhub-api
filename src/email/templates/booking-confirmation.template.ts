export const bookingConfirmationTemplate = (data: {
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
}): string => `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
      .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
      .booking-code { background-color: #EEF2FF; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; color: #4F46E5; margin: 20px 0; }
      .details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
      .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
      .detail-label { font-weight: bold; color: #6B7280; }
      .detail-value { color: #111827; }
      .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🎉 Booking Confirmed!</h1>
      </div>
      <div class="content">
        <p>Hi ${data.userName},</p>
        <p>Your booking has been confirmed! We're excited to see you at the event.</p>
        
        <div class="booking-code">
          ${data.bookingCode}
        </div>
        
        <div class="details">
          <h2>Event Details</h2>
          <div class="detail-row">
            <span class="detail-label">Event:</span>
            <span class="detail-value">${data.eventTitle}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date:</span>
            <span class="detail-value">${data.eventDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Time:</span>
            <span class="detail-value">${data.eventTime}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Venue:</span>
            <span class="detail-value">${data.eventVenue}, ${data.eventCity}</span>
          </div>
        </div>
        
        <div class="details">
          <h2>Booking Summary</h2>
          <div class="detail-row">
            <span class="detail-label">Ticket Type:</span>
            <span class="detail-value">${data.ticketType}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Quantity:</span>
            <span class="detail-value">${data.quantity}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Total Amount:</span>
            <span class="detail-value">$${data.totalAmount.toFixed(2)}</span>
          </div>
        </div>
        
        <p>Your tickets will be sent to you in a separate email shortly.</p>
      </div>
      <div class="footer">
        <p>Thank you for choosing EventHub!</p>
        <p>If you have any questions, please contact our support team.</p>
      </div>
    </div>
  </body>
</html>
`;
