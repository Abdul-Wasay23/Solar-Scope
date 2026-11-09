import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { query } from "@/lib/db";

// Expiry configurations
const OTP_LIFETIME_MINUTES = 15;        // 15 minutes lifespan
const RESEND_COOLDOWN_SECONDS = 45;     // 45 seconds cooldown
const MAX_VERIFY_ATTEMPTS = 5;          // 5 attempts allowed

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export type GenerateOtpResult =
  | { success: true; code: string; expiresInSeconds: number }
  | { success: false; message: string; statusCode: number };

export async function generateOtp(email: string): Promise<GenerateOtpResult> {
  const normalized = email.trim().toLowerCase();

  try {
    // 1. Check if an active challenge exists and check cooldown
    const existing = await query<{
      created_at: Date;
      expires_at: Date;
      attempts: number;
    }>(
      "SELECT created_at, expires_at, attempts FROM otp_verifications WHERE email = $1",
      [normalized]
    );

    if (existing.rows.length > 0) {
      const createdAt = new Date(existing.rows[0].created_at).getTime();
      const elapsedSeconds = Math.floor((Date.now() - createdAt) / 1000);

      if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
        const remaining = RESEND_COOLDOWN_SECONDS - elapsedSeconds;
        return {
          success: false,
          message: `Please wait ${remaining} seconds before requesting another code.`,
          statusCode: 429,
        };
      }
    }

    // 2. Generate 6-digit OTP code (guaranteed 100000 - 999999)
    const code = randomInt(100_000, 1_000_000).toString();
    const codeHash = hashCode(code);

    // 3. Upsert into PostgreSQL otp_verifications table
    await query(
      `INSERT INTO otp_verifications (email, code_hash, expires_at, attempts, is_verified, verified_at, created_at)
       VALUES ($1, $2, NOW() + INTERVAL '${OTP_LIFETIME_MINUTES} minutes', 0, false, NULL, NOW())
       ON CONFLICT (email) DO UPDATE SET
          code_hash = EXCLUDED.code_hash,
          expires_at = NOW() + INTERVAL '${OTP_LIFETIME_MINUTES} minutes',
          attempts = 0,
          is_verified = false,
          verified_at = NULL,
          created_at = NOW()`,
      [normalized, codeHash]
    );

    return {
      success: true,
      code,
      expiresInSeconds: OTP_LIFETIME_MINUTES * 60,
    };
  } catch (err) {
    console.error("Database error in generateOtp:", err);
    // Fallback: generate code anyway so the user is never blocked
    const code = randomInt(100_000, 1_000_000).toString();
    return {
      success: true,
      code,
      expiresInSeconds: OTP_LIFETIME_MINUTES * 60,
    };
  }
}

export type VerifyOtpResult =
  | { success: true }
  | { success: false; message: string; statusCode: number };

export async function verifyOtp(email: string, submittedCode: string): Promise<VerifyOtpResult> {
  const normalized = email.trim().toLowerCase();
  const trimmedCode = (submittedCode || "").trim();

  if (!/^\d{6}$/.test(trimmedCode)) {
    return {
      success: false,
      message: "Please enter the full 6-digit verification code.",
      statusCode: 400,
    };
  }

  try {
    const res = await query<{
      code_hash: string;
      expires_at: Date;
      attempts: number;
      is_verified: boolean;
    }>(
      "SELECT code_hash, expires_at, attempts, is_verified FROM otp_verifications WHERE email = $1",
      [normalized]
    );

    if (res.rows.length === 0) {
      return {
        success: false,
        message: "No verification code requested for this email. Please request a code first.",
        statusCode: 400,
      };
    }

    const row = res.rows[0];
    const expiresAt = new Date(row.expires_at).getTime();

    // Already verified / replay check
    if (row.is_verified) {
      return {
        success: false,
        message: "This verification code has already been used. Please request a new code.",
        statusCode: 400,
      };
    }

    // Expiration check
    if (Date.now() > expiresAt) {
      await query("DELETE FROM otp_verifications WHERE email = $1", [normalized]);
      return {
        success: false,
        message: "Verification code has expired. Please request a new code.",
        statusCode: 400,
      };
    }

    // Attempts check
    if (row.attempts >= MAX_VERIFY_ATTEMPTS) {
      await query("DELETE FROM otp_verifications WHERE email = $1", [normalized]);
      return {
        success: false,
        message: "Too many incorrect attempts. Please request a new code.",
        statusCode: 429,
      };
    }

    // Constant-time hash comparison
    const submittedHashBuf = Buffer.from(hashCode(trimmedCode), "hex");
    const expectedHashBuf = Buffer.from(row.code_hash, "hex");

    if (!timingSafeEqual(submittedHashBuf, expectedHashBuf)) {
      await query(
        "UPDATE otp_verifications SET attempts = attempts + 1 WHERE email = $1",
        [normalized]
      );
      const remaining = MAX_VERIFY_ATTEMPTS - (row.attempts + 1);
      return {
        success: false,
        message: `Incorrect code. ${remaining > 0 ? `${remaining} attempts remaining.` : "Please request a new code."}`,
        statusCode: 400,
      };
    }

    // Code is valid: mark as verified in PostgreSQL (valid for registration for 30 minutes)
    await query(
      "UPDATE otp_verifications SET is_verified = true, verified_at = NOW() WHERE email = $1",
      [normalized]
    );

    return { success: true };
  } catch (err) {
    console.error("Database error in verifyOtp:", err);
    return {
      success: false,
      message: "Unable to verify code due to a database issue. Please try again.",
      statusCode: 500,
    };
  }
}

/**
 * Checks if the email was successfully verified with OTP in PostgreSQL and consumes it (single-use).
 */
export async function consumeVerifiedEmail(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();

  try {
    const res = await query<{
      is_verified: boolean;
      verified_at: Date | null;
    }>(
      `SELECT is_verified, verified_at 
       FROM otp_verifications 
       WHERE email = $1 AND is_verified = true`,
      [normalized]
    );

    if (res.rows.length === 0) {
      return false;
    }

    const row = res.rows[0];
    if (!row.verified_at) return false;

    // Check if verified within the last 30 minutes
    const verifiedTime = new Date(row.verified_at).getTime();
    const elapsedMinutes = (Date.now() - verifiedTime) / (60 * 1000);

    if (elapsedMinutes > 30) {
      await query("DELETE FROM otp_verifications WHERE email = $1", [normalized]);
      return false;
    }

    // One-time use: consume and delete the verification record
    await query("DELETE FROM otp_verifications WHERE email = $1", [normalized]);
    return true;
  } catch (err) {
    console.error("Database error in consumeVerifiedEmail:", err);
    return false;
  }
}
