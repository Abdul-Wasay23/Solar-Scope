import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
}));

import { query } from "@/lib/db";
import { createPasswordResetToken } from "./passwordReset";

describe("createPasswordResetToken", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("inserts the token hash with the account id and normalized email", async () => {
    vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 1 });

    const rawToken = await createPasswordResetToken("17", "Member@Example.com");
    const tokenHash = createHash("sha256").update(rawToken.trim()).digest("hex");

    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("INSERT INTO password_reset_tokens"),
      ["17", "member@example.com", tokenHash]
    );
    expect(rawToken).not.toBe(tokenHash);
  });
});
