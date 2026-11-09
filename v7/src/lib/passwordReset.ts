import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

let tableEnsured = false;

export async function ensurePasswordResetTable(): Promise<void> {
  if (tableEnsured) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        token_hash VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN NOT NULL DEFAULT FALSE,
        used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_pwd_reset_tokens_email ON password_reset_tokens(email);
      CREATE INDEX IF NOT EXISTS idx_pwd_reset_tokens_token_hash ON password_reset_tokens(token_hash);
    `);
    tableEnsured = true;
  } catch (err) {
    console.error("Failed to ensure password_reset_tokens table:", err);
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export type AccountSuggestion = {
  email: string;
  fullName: string;
};

export async function suggestRegisteredAccounts(
  queryText: string
): Promise<AccountSuggestion[]> {
  const trimmed = queryText.trim().toLowerCase();
  if (!trimmed) return [];

  // Search by email prefix or name substring, active users only
  const pattern = `%${trimmed}%`;
  const result = await query<{ email: string; full_name: string }>(
    `SELECT email, full_name
     FROM users
     WHERE is_active = true
       AND (LOWER(email) LIKE $1 OR LOWER(full_name) LIKE $1)
     ORDER BY
       CASE WHEN LOWER(email) LIKE $2 THEN 0 ELSE 1 END,
       email ASC
     LIMIT 6`,
    [pattern, `${trimmed}%`]
  );

  return result.rows.map((row) => ({
    email: row.email,
    fullName: row.full_name || "Account Holder",
  }));
}

export type RegisteredAccount = {
  id: string | number;
  email: string;
  fullName: string;
  isActive: boolean;
};

export async function findRegisteredAccount(
  email: string
): Promise<RegisteredAccount | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const result = await query<{
    id: string | number;
    email: string;
    full_name: string;
    is_active: boolean;
  }>(
    `SELECT id, email, full_name, is_active
     FROM users
     WHERE LOWER(email) = $1
     LIMIT 1`,
    [normalized]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name || "Account Holder",
    isActive: Boolean(row.is_active),
  };
}

export async function createPasswordResetToken(
  userId: string | number,
  email: string
): Promise<string> {
  await ensurePasswordResetTable();

  const normalized = email.trim().toLowerCase();
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);

  // Invalidate any existing unused reset tokens for this user
  await query(
    `UPDATE password_reset_tokens
     SET used = true
     WHERE LOWER(email) = $1 AND used = false`,
    [normalized]
  );

  // Insert token valid for 60 minutes
  await query(
    `INSERT INTO password_reset_tokens (user_id, email, token_hash, expires_at, used, created_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '60 minutes', false, NOW())`,
    [userId, normalized, tokenHash]
  );

  return rawToken;
}

export type VerifyTokenResult =
  | {
      valid: true;
      userId: string | number;
      email: string;
      fullName: string;
      tokenId: string | number;
    }
  | {
      valid: false;
      error: string;
    };

export async function verifyPasswordResetToken(
  rawToken: string
): Promise<VerifyTokenResult> {
  if (!rawToken || typeof rawToken !== "string" || !rawToken.trim()) {
    return {
      valid: false,
      error: "Missing or invalid password reset token.",
    };
  }

  await ensurePasswordResetTable();
  const tokenHash = hashToken(rawToken);

  const result = await query<{
    id: string | number;
    user_id: string | number;
    email: string;
    expires_at: Date;
    used: boolean;
    full_name: string;
    is_active: boolean;
  }>(
    `SELECT t.id, t.user_id, t.email, t.expires_at, t.used, u.full_name, u.is_active
     FROM password_reset_tokens t
     JOIN users u ON t.user_id = u.id
     WHERE t.token_hash = $1
     LIMIT 1`,
    [tokenHash]
  );

  if (result.rows.length === 0) {
    return {
      valid: false,
      error: "Invalid password reset link. Please request a new one.",
    };
  }

  const row = result.rows[0];

  if (row.used) {
    return {
      valid: false,
      error: "This password reset link has already been used. Please request a new one.",
    };
  }

  if (new Date() > new Date(row.expires_at)) {
    return {
      valid: false,
      error: "This password reset link has expired. Please request a new one.",
    };
  }

  if (!row.is_active) {
    return {
      valid: false,
      error: "This account has been deactivated. Please contact support.",
    };
  }

  return {
    valid: true,
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name || "Account Holder",
    tokenId: row.id,
  };
}

export type ResetPasswordResult =
  | { success: true; message: string }
  | { success: false; error: string; statusCode?: number };

export async function completePasswordReset(
  rawToken: string,
  newPassword: string
): Promise<ResetPasswordResult> {
  const verification = await verifyPasswordResetToken(rawToken);
  if (!verification.valid) {
    return {
      success: false,
      error: verification.error,
      statusCode: 400,
    };
  }

  const trimmedPassword = (newPassword || "").trim();
  if (trimmedPassword.length < 8) {
    return {
      success: false,
      error: "Password must be at least 8 characters long.",
      statusCode: 400,
    };
  }

  try {
    const passwordHash = await bcrypt.hash(trimmedPassword, 10);

    // Update user's password in PostgreSQL
    await query(
      `UPDATE users
       SET password_hash = $1, updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, verification.userId]
    );

    // Mark the reset token as used (single-use enforcement)
    await query(
      `UPDATE password_reset_tokens
       SET used = true, used_at = NOW()
       WHERE id = $1`,
      [verification.tokenId]
    );

    return {
      success: true,
      message: "Password reset successful. You can now sign in with your new password.",
    };
  } catch (err: any) {
    console.error("Error updating user password:", err);
    return {
      success: false,
      error: "Failed to update password. Please try again later.",
      statusCode: 500,
    };
  }
}

