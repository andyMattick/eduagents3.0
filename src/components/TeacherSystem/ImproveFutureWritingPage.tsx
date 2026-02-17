export function ImproveFutureWritingPage({ assignmentId }) {
  return (
    <div className="page-container">
      <h1 className="page-title">Improve Future Writing</h1>

      <p className="mt-4">
        Use the classroom results from Assessment #{assignmentId} to help the system
        refine its future assessments.
      </p>

      <p className="mt-2 text-muted-foreground">
        When you run the improvement process, the system updates difficulty
        calibration, timing estimates, misconception clusters, and problem‑writing
        heuristics based on real student performance.
      </p>

      <button className="btn-primary mt-6">
        Apply Improvements
      </button>
    </div>
  );
}
