export function ViewAssessmentPage({ assignmentId }) {
  return (
    <div className="page-container">
      <h1 className="page-title">Assessment #{assignmentId}</h1>

      <p className="mt-4">
        Below is the assessment generated for this assignment. You can review the
        final document, answer key, and problem details before sharing it with
        students.
      </p>

      <div className="mt-6 space-y-6">
        <section>
          <h2 className="section-title">Final Document</h2>
          <p className="text-muted-foreground">
            The full assessment will appear here once the generation pipeline is connected.
          </p>
        </section>

        <section>
          <h2 className="section-title">Answer Key</h2>
          <p className="text-muted-foreground">
            The answer key for all generated problems will be displayed here.
          </p>
        </section>

        <section>
          <h2 className="section-title">Problem Details</h2>
          <p className="text-muted-foreground">
            Each problem’s metadata, difficulty estimate, and predicted misconceptions
            will be shown here.
          </p>
        </section>
      </div>
    </div>
  );
}
