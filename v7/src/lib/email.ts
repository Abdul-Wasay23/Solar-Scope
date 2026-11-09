import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export const OFFICIAL_SOLARSCOPE_EMAIL =
  process.env.OFFICIAL_EMAIL || "info.solarscope@gmail.com";

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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export type SendPasswordResetParams = {
  to: string;
  fullName: string;
  resetUrl: string;
};

export async function sendPasswordResetEmail({
  to,
  fullName,
  resetUrl,
}: SendPasswordResetParams): Promise<SendEmailResult> {
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
    const officialEmail = OFFICIAL_SOLARSCOPE_EMAIL;

    const safeName = escapeHtml(fullName || "User");
    const safeEmail = escapeHtml(to);

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
            .text { font-size: 15px; color: #9ca3af; line-height: 1.6; margin-bottom: 20px; }
            .btn-wrapper { text-align: center; margin: 28px 0; }
            .btn { display: inline-block; background-color: #f59e0b; color: #0f172a !important; text-decoration: none; padding: 14px 32px; font-size: 15px; font-weight: 700; border-radius: 8px; letter-spacing: 0.01em; }
            .link-alt { font-size: 12px; color: #6b7280; word-break: break-all; margin-top: 16px; line-height: 1.5; }
            .link-alt a { color: #f59e0b; }
            .expiry { font-size: 13px; color: #9ca3af; margin-top: 16px; padding: 12px; background: #1c263c; border-radius: 6px; }
            .footer { font-size: 12px; color: #4b5563; border-top: 1px solid #1f293d; padding-top: 16px; margin-top: 24px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="brand">☀️ SolarScope</div>
            <div class="title">Reset Your Password</div>
            <div class="text">
              Hello <strong>${safeName}</strong>,
            </div>
            <div class="text">
              We received a request to reset the password for your SolarScope account associated with <strong>${safeEmail}</strong>. Click the button below to set a new password:
            </div>
            <div class="btn-wrapper">
              <a href="${resetUrl}" class="btn" target="_blank" rel="noopener noreferrer">Reset My Password</a>
            </div>
            <div class="expiry">
              ⏱️ <strong>Time-limited link:</strong> This recovery link expires in 60 minutes and can only be used once.
            </div>
            <div class="link-alt">
              If the button above does not work, copy and paste this link into your browser:<br/>
              <a href="${resetUrl}">${resetUrl}</a>
            </div>
            <div class="text" style="margin-top: 20px; font-size: 13px;">
              If you did not request this password reset, please ignore this email. Your current password remains secure.
            </div>
            <div class="footer">
              SolarScope — Solar PV Planning & Marketplace Platform.<br/>
              Official Inquiries: <a href="mailto:${officialEmail}" style="color: #f59e0b;">${officialEmail}</a><br/>
              This is an automated security verification message.
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `Hello ${fullName || "User"},\n\nWe received a request to reset the password for your SolarScope account (${to}).\n\nPlease visit the following link to reset your password:\n${resetUrl}\n\nThis link is valid for 60 minutes and can only be used once.\n\nOfficial Support: ${officialEmail}\n\nIf you did not request this, please ignore this message.`;

    await mailTransporter.sendMail({
      from: `"SolarScope" <${officialEmail}>`,
      replyTo: officialEmail,
      to,
      subject: `Reset your SolarScope password`,
      text: textContent,
      html: htmlContent,
    });

    return { success: true };
  } catch (err: any) {
    console.error("Gmail SMTP Password Reset Send Error:", err);
    return {
      success: false,
      error: err?.message || "Failed to send password reset email via Gmail SMTP.",
    };
  }
}

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
    const officialEmail = OFFICIAL_SOLARSCOPE_EMAIL;

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
              Official Inquiries: <a href="mailto:${officialEmail}" style="color: #f59e0b;">${officialEmail}</a><br/>
              This is an automated security verification message.
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `Your SolarScope verification code is: ${code}\n\nThis code will expire in 10 minutes. Official inquiries: ${officialEmail}\n\nIf you did not request this code, please ignore this email.`;

    await mailTransporter.sendMail({
      from: `"SolarScope" <${officialEmail}>`,
      replyTo: officialEmail,
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
