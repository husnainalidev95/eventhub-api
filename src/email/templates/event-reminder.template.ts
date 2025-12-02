export const eventReminderTemplate = (data: {
  userName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  eventAddress: string;
  ticketCount: number;
}): string => `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
      .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
      .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>⏰ Event Reminder</h1>
      </div>
      <div class="content">
        <p>Hi ${data.userName},</p>
        <p>This is a friendly reminder that your event is happening tomorrow!</p>
        
        <div style="background-color: #D1FAE5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
          <h2 style="margin-top: 0; color: #065F46;">${data.eventTitle}</h2>
          <p><strong>📅 Date:</strong> ${data.eventDate}</p>
          <p><strong>🕒 Time:</strong> ${data.eventTime}</p>
          <p><strong>📍 Venue:</strong> ${data.eventVenue}</p>
          <p><strong>🗺️ Address:</strong> ${data.eventAddress}</p>
          <p><strong>🎫 Tickets:</strong> ${data.ticketCount}</p>
        </div>
        
        <div style="background-color: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>💡 Tips:</strong></p>
          <ul style="margin: 10px 0;">
            <li>Arrive early to avoid queues</li>
            <li>Bring a valid ID</li>
            <li>Have your ticket codes ready</li>
            <li>Check the venue's parking information</li>
          </ul>
        </div>
        
        <p>We can't wait to see you there!</p>
      </div>
      <div class="footer">
        <p>Have a great event!</p>
        <p>EventHub Team</p>
      </div>
    </div>
  </body>
</html>
`;
