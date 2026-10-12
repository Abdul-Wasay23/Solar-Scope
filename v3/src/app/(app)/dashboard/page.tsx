import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

export default function DashboardPage() {
  return (
    <>
      <section style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-primary)" }}>
          Welcome to SolarScope
        </h2>
        <p style={{ marginTop: "6px", color: "var(--color-text-muted)", fontSize: "14px" }}>
          Manage your solar planning projects from one workspace.
        </p>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "20px",
          marginBottom: "28px",
        }}
      >
        <Card title="Total Projects">
          <p style={{ marginTop: "12px", fontSize: "32px", fontWeight: 800, color: "var(--color-primary)" }}>
            0
          </p>
          <p style={{ marginTop: "6px", fontSize: "13px", color: "var(--color-text-muted)" }}>
            Projects created so far
          </p>
        </Card>

        <Card title="In Progress">
          <p style={{ marginTop: "12px", fontSize: "32px", fontWeight: 800, color: "var(--color-primary)" }}>
            0
          </p>
          <p style={{ marginTop: "6px", fontSize: "13px", color: "var(--color-text-muted)" }}>
            Projects currently being planned
          </p>
        </Card>

        <Card title="Completed">
          <p style={{ marginTop: "12px", fontSize: "32px", fontWeight: 800, color: "var(--color-primary)" }}>
            0
          </p>
          <p style={{ marginTop: "6px", fontSize: "13px", color: "var(--color-text-muted)" }}>
            Projects marked as complete
          </p>
        </Card>
      </section>

      <section>
        <Card
          title="Recent Projects"
          description="Your latest solar planning work will appear here."
        >
          <div style={{ padding: "32px 16px", textAlign: "center" }}>
            <p style={{ fontWeight: 600, color: "var(--color-primary)", fontSize: "16px" }}>
              No projects yet
            </p>
            <p style={{ marginTop: "8px", color: "var(--color-text-muted)", fontSize: "14px" }}>
              Project creation will be implemented in Module 3.
            </p>
            <div style={{ marginTop: "16px" }}>
              <Badge variant="accent">Foundation Preview</Badge>
            </div>
          </div>
        </Card>
      </section>
    </>
  );
}
