export function ComparePredictedActualPage({ assignmentId }) {
  return (
    <div className="page-container">
      <h1 className="page-title">Predicted vs Actual Performance</h1>

      <p className="mt-4">
        This page compares the system’s predictions for Assessment #{assignmentId}
        with the actual classroom results you reported.
      </p>

      <div className="mt-6 space-y-6">
        <section>
          <h2 className="section-title">Difficulty Accuracy</h2>
          <p className="text-muted-foreground">
            See where predicted difficulty matched or differed from student performance.
          </p>
        </section>

        <section>
          <h2 className="section-title">Timing Accuracy</h2>
          <p className="text-muted-foreground">
            Compare predicted time-to-solve with actual time students spent.
          </p>
        </section>

        <section>
          <h2 className="section-title">Misconception Patterns</h2>
          <p className="text-muted-foreground">
            Review which misconceptions were predicted and which actually occurred.
          </p>
        </section>

        <section>
          <h2 className="section-title">Per‑Problem Breakdown</h2>
          <p className="text-muted-foreground">
            A detailed comparison for each problem will appear here.
          </p>
        </section>
      </div>
    </div>
  );
}
