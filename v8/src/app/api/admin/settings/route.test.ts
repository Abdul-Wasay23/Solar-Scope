import { describe, expect, it, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { GET, POST } from "./route";
import * as db from "@/lib/db";

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
}));

describe("Admin Settings API Route (/api/admin/settings)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/settings", () => {
    it("returns the admin profile without password or hash", async () => {
      (db.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: 3,
            full_name: "Platform Admin",
            email: "admin@example.test",
            created_at: new Date(),
          },
        ],
        rowCount: 1,
      });

      const req = new Request("http://localhost:3000/api/admin/settings?userId=3");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual({
        id: "3",
        fullName: "Platform Admin",
        email: "admin@example.test",
      });
      expect(data.password).toBeUndefined();
      expect(data.password_hash).toBeUndefined();
    });
  });

  describe("POST /api/admin/settings", () => {
    it("updates full name and email address in database", async () => {
      // Mock finding admin
      (db.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: 3,
            full_name: "Old Admin",
            email: "oldadmin@example.test",
            password_hash: "$2b$10$oldhash",
          },
        ],
        rowCount: 1,
      });

      // Mock duplicate email check (0 rows found)
      (db.query as any).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      // Mock update query
      (db.query as any).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      const req = new Request("http://localhost:3000/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "3",
          fullName: "New Admin Name",
          email: "newadmin@example.test",
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toMatch(/updated successfully/i);
      expect(data.user).toEqual({
        id: "3",
        fullName: "New Admin Name",
        email: "newadmin@example.test",
      });
      expect(data.user.password).toBeUndefined();
      expect(data.user.password_hash).toBeUndefined();
    });

    it("rejects password change if current password is incorrect", async () => {
      const realHash = await bcrypt.hash("correct123", 10);

      (db.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: 3,
            full_name: "Platform Admin",
            email: "admin@example.test",
            password_hash: realHash,
          },
        ],
        rowCount: 1,
      });

      const req = new Request("http://localhost:3000/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "3",
          currentPassword: "wrongpassword",
          newPassword: "newsecretpassword",
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.message).toBe("Current password is incorrect.");
    });

    it("rejects new password shorter than 6 characters", async () => {
      const req = new Request("http://localhost:3000/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "3",
          currentPassword: "correctpassword",
          newPassword: "123",
        }),
      });

      (db.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: 3,
            full_name: "Platform Admin",
            email: "admin@example.test",
            password_hash: "hash",
          },
        ],
        rowCount: 1,
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.message).toBe("New password must be at least 6 characters long.");
    });

    it("updates password successfully when current password is verified", async () => {
      const oldHash = await bcrypt.hash("currentpass123", 10);

      // Find admin
      (db.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: 3,
            full_name: "Platform Admin",
            email: "admin@example.test",
            password_hash: oldHash,
          },
        ],
        rowCount: 1,
      });

      // UPDATE users SET password_hash = ...
      (db.query as any).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      // UPDATE users SET full_name = ...
      (db.query as any).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      const req = new Request("http://localhost:3000/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "3",
          currentPassword: "currentpass123",
          newPassword: "brandnewpassword456",
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toMatch(/updated successfully/i);
      expect(data.user.password_hash).toBeUndefined();
    });

    it("rejects duplicate email if already used by another account", async () => {
      (db.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: 3,
            full_name: "Platform Admin",
            email: "admin@example.test",
            password_hash: "hash",
          },
        ],
        rowCount: 1,
      });

      // Duplicate check returns another user with that email
      (db.query as any).mockResolvedValueOnce({
        rows: [{ id: 1 }],
        rowCount: 1,
      });

      const req = new Request("http://localhost:3000/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "3",
          email: "taken@example.com",
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.message).toBe("An account with this email address already exists.");
    });
  });
});

