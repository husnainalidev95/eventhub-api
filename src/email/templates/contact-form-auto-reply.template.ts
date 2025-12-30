export const contactFormAutoReplyTemplate = (data: { name: string; subject: string }) => {
  return `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
      .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
      .info-box { background-color: #D1FAE5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981; }
      .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>✅ Thank You for Contacting Us!</h1>
      </div>
      <div class="content">
        <p>Hi ${data.name},</p>
        <p>Thank you for reaching out to EventHub! We have received your message regarding:</p>
        
        <div class="info-box">
          <p style="margin: 0;"><strong>📋 Subject:</strong> ${data.subject}</p>
        </div>
        
        <p>Our team will review your message and get back to you as soon as possible, typically within 24-48 hours.</p>
        
        <p>In the meantime, feel free to explore our platform and discover amazing events happening near you!</p>
        
        <div style="background-color: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
          <p style="margin: 0;"><strong>💡 Tip:</strong> If you have an urgent inquiry, please call our support line or check our FAQ section.</p>
        </div>
      </div>
      <div class="footer">
        <p>Best regards,</p>
        <p><strong>EventHub Team</strong></p>
        <p style="margin-top: 20px; font-size: 12px;">This is an automated response. Please do not reply to this email.</p>
      </div>
    </div>
  </body>
</html>
`;
};
