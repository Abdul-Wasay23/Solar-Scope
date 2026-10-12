import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

export default function ProfileSettingsPage() {
  return (
    <>
      <section style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-primary)" }}>
          Profile Settings
        </h2>
        <p style={{ marginTop: "6px", color: "var(--color-text-muted)", fontSize: "14px" }}>
          Manage your account preferences and credentials.
        </p>
      </section>

      <Card title="Account Settings">
        <div style={{ padding: "36px 16px", textAlign: "center" }}>
          <p style={{ fontWeight: 600, color: "var(--color-primary)", fontSize: "16px" }}>
            Profile settings are not configured yet
          </p>
          <p style={{ marginTop: "8px", color: "var(--color-text-muted)", fontSize: "14px" }}>
            Profile forms and account preferences will be added in a later module.
          </p>
          <div style={{ marginTop: "16px" }}>
            <Badge variant="neutral">Foundation Preview</Badge>
          </div>
        </div>
      </Card>
    </>
  );
}
