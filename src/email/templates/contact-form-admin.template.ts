export const contactFormAdminTemplate = (data: {
  name: string;
  email: string;
  subject: string;
  message: string;
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
      .info-box { background-color: #EEF2FF; padding: 15px; border-radius: 8px; margin: 15px 0; }
      .message-box { background-color: white; padding: 20px; border-left: 4px solid #4F46E5; margin: 20px 0; border-radius: 4px; }
      .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>📧 New Contact Form Submission</h1>
      </div>
      <div class="content">
        <p>You have received a new contact form submission from EventHub.</p>
        
        <div class="info-box">
          <p><strong>👤 Name:</strong> ${data.name}</p>
          <p><strong>✉️ Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
          <p><strong>📋 Subject:</strong> ${data.subject}</p>
        </div>
        
        <div class="message-box">
          <h3 style="margin-top: 0; color: #4F46E5;">Message:</h3>
          <p style="white-space: pre-wrap;">${data.message}</p>
        </div>
        
        <p style="margin-top: 30px;">
          <a href="mailto:${data.email}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reply to ${data.name}
          </a>
        </p>
      </div>
      <div class="footer">
        <p>This is an automated notification from EventHub.</p>
      </div>
    </div>
  </body>
</html>
`;
};

