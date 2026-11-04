import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "24px",
        textAlign: "center",
        backgroundColor: "var(--color-background)",
      }}
    >
      <div
        style={{
          display: "inline-block",
          padding: "6px 14px",
          borderRadius: "var(--radius-full)",
          backgroundColor: "var(--color-accent-light)",
          color: "var(--color-primary)",
          fontWeight: 700,
          fontSize: "var(--font-size-sm)",
          marginBottom: "16px",
        }}
      >
        404 ERROR
      </div>

      <h1 style={{ marginBottom: "12px" }}>Page Not Found</h1>

      <p
        style={{
          maxWidth: "460px",
          color: "var(--color-text-body)",
          marginBottom: "28px",
        }}
      >
        The page you are looking for does not exist or may have been moved.
      </p>

      <Link
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "12px 24px",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--color-accent)",
          color: "var(--color-primary)",
          fontWeight: 700,
          fontSize: "var(--font-size-sm)",
          transition: "background-color 180ms ease",
        }}
      >
        Return to Home
      </Link>
    </main>
  );
}
