export function GenerateNewVersionPage({ assignmentId }) {
  return (
    <div className="page-container">
      <h1 className="page-title">Generate a New Version</h1>

      <p className="mt-4">
        Create an updated version of Assessment #{assignmentId} using the system’s
        improved understanding of student performance.
      </p>

      <p className="mt-2 text-muted-foreground">
        New versions incorporate updated difficulty calibration, refined
        misconceptions, and improved problem‑writing patterns.
      </p>

      <button className="btn-primary mt-6">
        Generate New Version
      </button>
    </div>
  );
}
