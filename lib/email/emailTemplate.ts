export const emailTemplate = ({
    type,
    content,
}: {
    type: string;
    content: any;
}): { subject: string; html: string } => {
    const confirmationCode = content?.confirmationCode || content?.otp || content?.code || '----';
    const recipientName = content?.fullName || content?.name || 'Valued Customer';

    const templateObject: Record<string, { subject: string; html: string }> = {
        forgotPassword: {
            subject: `Password Reset Confirmation Code: ${confirmationCode} - Grace Fresh Market`,
            html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Forgot Password Verification - Grace Fresh Market</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6f8;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #334155;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f8; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
          
          <!-- Brand Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #15803d 0%, #16a34a 100%); padding: 32px 30px; text-align: center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Grace Fresh Market</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Body -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">
                Forgot Password Verification
              </h2>

              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                Hello <strong>${recipientName}</strong>,
              </p>

              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                We received a request to reset your password for your <strong>Grace Fresh Market</strong> account. To proceed with the password reset, please use the 4-digit confirmation code below:
              </p>

              <!-- Prominent 4-Digit Code Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <div style="background-color: #f0fdf4; border: 2px dashed #86efac; border-radius: 12px; padding: 22px 28px; text-align: center; display: inline-block; min-width: 260px;">
                      <span style="display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #166534; margin-bottom: 8px;">
                        Password Reset Confirmation Code
                      </span>
                      <span style="display: block; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 40px; font-weight: 800; letter-spacing: 12px; color: #15803d; line-height: 1.2; text-indent: 12px;">
                        ${confirmationCode}
                      </span>
                      <span style="display: block; font-size: 12px; color: #64748b; margin-top: 8px;">
                        Use this code to verify your identity and set a new password
                      </span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Notice Alert -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0 20px 0; background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #92400e;">
                      <strong>Security Notice:</strong> Do not share this confirmation code with anyone. Grace Fresh Market staff will never contact you asking for your confirmation code or password.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.6; color: #64748b;">
                If you did not initiate this password reset request, you can safely disregard this email. Your password will remain unchanged and your account remains secure.
              </p>
            </td>
          </tr>

          <!-- Professional Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 36px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #334155;">
                Grace Fresh Market Team
              </p>
              <p style="margin: 0 0 12px 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                Delivering fresh farm produce, fruits, vegetables, and daily essentials.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                &copy; 2026 Grace Fresh Market. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim(),
        },
    };

    return templateObject[type] || { subject: '', html: '' };
};