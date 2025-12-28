export const passwordResetTemplate = (data: {
  userName: string;
  resetLink: string;
}) => {
  return `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background-color: #DC2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
      .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
      .button { display: inline-block; background-color: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
      .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
      .warning { background-color: #FEE2E2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #DC2626; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🔒 Reset Your Password</h1>
      </div>
      <div class="content">
        <p>Hi ${data.userName},</p>
        <p>We received a request to reset your password for your EventHub account.</p>
        
        <div style="text-align: center;">
          <a href="${data.resetLink}" class="button" style="color: white;">Reset Password</a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #DC2626;">${data.resetLink}</p>
        
        <div class="warning">
          <p style="margin: 0;"><strong>⚠️ Security Notice:</strong></p>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>This link will expire in 1 hour</li>
            <li>If you didn't request a password reset, please ignore this email</li>
            <li>Your password will remain unchanged if you don't click the link</li>
          </ul>
        </div>
      </div>
      <div class="footer">
        <p>If you have any concerns, please contact our support team immediately.</p>
        <p>EventHub Team</p>
      </div>
    </div>
  </body>
</html>
`;
};

