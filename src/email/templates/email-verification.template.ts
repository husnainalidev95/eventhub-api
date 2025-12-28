export const emailVerificationTemplate = (data: {
  userName: string;
  verificationLink: string;
}) => {
  return `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
      .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
      .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
      .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
      .warning { background-color: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>✉️ Verify Your Email Address</h1>
      </div>
      <div class="content">
        <p>Hi ${data.userName},</p>
        <p>Thank you for signing up for EventHub! Please verify your email address to complete your registration.</p>
        
        <div style="text-align: center;">
          <a href="${data.verificationLink}" class="button" style="color: white;">Verify Email Address</a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #4F46E5;">${data.verificationLink}</p>
        
        <div class="warning">
          <p style="margin: 0;"><strong>⚠️ Important:</strong> This verification link will expire in 24 hours. If you didn't create an account, please ignore this email.</p>
        </div>
      </div>
      <div class="footer">
        <p>If you have any questions, please contact our support team.</p>
        <p>EventHub Team</p>
      </div>
    </div>
  </body>
</html>
`;
};

