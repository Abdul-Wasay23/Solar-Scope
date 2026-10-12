import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

export default function ProjectsPage() {
  return (
    <>
      <section style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-primary)" }}>
          Projects
        </h2>
        <p style={{ marginTop: "6px", color: "var(--color-text-muted)", fontSize: "14px" }}>
          Create and organize your solar planning projects.
        </p>
      </section>

      <Card title="Project Management">
        <div style={{ padding: "36px 16px", textAlign: "center" }}>
          <p style={{ fontWeight: 600, color: "var(--color-primary)", fontSize: "16px" }}>
            Project management is coming next
          </p>
          <p style={{ marginTop: "8px", color: "var(--color-text-muted)", fontSize: "14px" }}>
            Project creation, project lists and project details will be implemented in Module 3.
          </p>
          <div style={{ marginTop: "16px" }}>
            <Badge variant="info">Coming in Module 3</Badge>
          </div>
        </div>
      </Card>
    </>
  );
}
