export const ticketEmailTemplate = (data: {
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
}): string => {
  const ticketsList = data.tickets
    .map(
      (ticket) => `
      <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 15px 0; border: 2px solid #4F46E5;">
        <h3 style="color: #4F46E5; margin-top: 0;">${ticket.ticketType}</h3>
        <p style="font-size: 18px; font-weight: bold; color: #111827;">Ticket Code: ${ticket.ticketCode}</p>
        <p style="font-size: 12px; color: #6B7280;">Show this code at the venue entrance</p>
      </div>
    `,
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
      .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
      .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🎫 Your Tickets Are Here!</h1>
      </div>
      <div class="content">
        <p>Hi ${data.userName},</p>
        <p>Here are your tickets for <strong>${data.eventTitle}</strong></p>
        
        <div style="background-color: #EEF2FF; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>📅 Date:</strong> ${data.eventDate}</p>
          <p><strong>🕒 Time:</strong> ${data.eventTime}</p>
          <p><strong>📍 Venue:</strong> ${data.eventVenue}</p>
          <p><strong>🗺️ Address:</strong> ${data.eventAddress}</p>
        </div>
        
        <h2 style="color: #4F46E5;">Your Tickets</h2>
        ${ticketsList}
        
        <div style="background-color: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
          <p style="margin: 0;"><strong>⚠️ Important:</strong> Please bring a valid ID and show your ticket code at the venue entrance.</p>
        </div>
      </div>
      <div class="footer">
        <p>See you at the event!</p>
        <p>EventHub Team</p>
      </div>
    </div>
  </body>
</html>
`;
};
