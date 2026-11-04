import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      "Gmail credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local"
    );
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // Use SSL
      auth: {
        user,
        pass,
      },
    });
  }

  return transporter;
}

export type SendEmailResult =
  | { success: true }
  | { success: false; error: string };

export async function sendOtpEmail(to: string, code: string): Promise<SendEmailResult> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return {
      success: false,
      error: "Gmail SMTP credentials (GMAIL_USER, GMAIL_APP_PASSWORD) are not set in .env.local",
    };
  }

  try {
    const mailTransporter = getTransporter();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 24px; }
            .container { max-width: 520px; margin: 0 auto; background: #131b2e; border: 1px solid #1f293d; border-radius: 12px; padding: 32px; box-shadow: 0 8px 30px rgba(0,0,0,0.5); }
            .brand { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; color: #f59e0b; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
            .title { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
            .text { font-size: 15px; color: #9ca3af; line-height: 1.6; margin-bottom: 24px; }
            .otp-box { background: #1c263c; border: 1px solid #374151; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px; }
            .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #fbbf24; font-family: 'Courier New', Courier, monospace; }
            .expiry { font-size: 13px; color: #6b7280; margin-top: 8px; }
            .footer { font-size: 12px; color: #4b5563; border-top: 1px solid #1f293d; padding-top: 16px; margin-top: 24px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="brand">☀️ SolarScope</div>
            <div class="title">Verify Your Email Address</div>
            <div class="text">
              Thank you for registering with SolarScope. Please use the following 6-digit verification code to complete your signup:
            </div>
            <div class="otp-box">
              <div class="otp-code">${code}</div>
              <div class="expiry">This code will expire in 10 minutes.</div>
            </div>
            <div class="text">
              If you did not request this verification code, please ignore this email. Do not share this code with anyone.
            </div>
            <div class="footer">
              SolarScope — Solar PV Planning & Marketplace Platform.<br/>
              This is an automated security verification message.
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `Your SolarScope verification code is: ${code}\n\nThis code will expire in 10 minutes. If you did not request this code, please ignore this email.`;

    await mailTransporter.sendMail({
      from: `"SolarScope" <${user}>`,
      to,
      subject: `${code} is your SolarScope verification code`,
      text: textContent,
      html: htmlContent,
    });

    return { success: true };
  } catch (err: any) {
    console.error("Gmail SMTP Send Error:", err);
    return {
      success: false,
      error: err?.message || "Failed to send email via Gmail SMTP.",
    };
  }
}
