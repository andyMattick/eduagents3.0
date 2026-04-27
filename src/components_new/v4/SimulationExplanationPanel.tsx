/**
 * src/components_new/v4/SimulationExplanationPanel.tsx
 *
 * Teacher-facing explanation panel for Option D Simulation 2.1 metrics.
 * Render this alongside the ShortCircuitGraph to help teachers understand
 * what each chart series means.
 */

export function SimulationExplanationPanel() {
  return (
    <div
      style={{
        padding: "1.5rem",
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        fontSize: "0.875rem",
        lineHeight: "1.6",
        maxWidth: "680px",
      }}
    >
      <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem", color: "#111827" }}>
        Understanding the Simulation
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <section>
          <h3 style={headingStyle}>Linguistic Load</h3>
          <p style={bodyStyle}>
            Linguistic Load represents how challenging the language of each item is.
            It combines vocabulary difficulty (based on syllable count) and average
            word length into a single score from 0 to 1. A score of 0 means simple,
            familiar language; 1 means dense, multi-syllabic vocabulary.
          </p>
        </section>

        <section>
          <h3 style={headingStyle}>Cumulative Linguistic Load</h3>
          <p style={bodyStyle}>
            This shows how linguistic difficulty accumulates across the worksheet.
            A rising slope means students may experience increasing effort as they
            progress. A flat line means the language stays consistently accessible
            throughout.
          </p>
        </section>

        <section>
          <h3 style={headingStyle}>Confusion Score</h3>
          <p style={bodyStyle}>
            Confusion Score estimates how likely students are to misunderstand an
            item. It weighs linguistic load, distractor density, number of steps,
            time required, and misconception risk. High confusion items may benefit
            from clearer wording or additional scaffolding.
          </p>
        </section>

        <section>
          <h3 style={headingStyle}>Steps</h3>
          <p style={bodyStyle}>
            Steps represent how many reasoning steps are required to complete an
            item. More steps mean more procedural demand. This is normalized to 0–1
            so it can be compared directly with the other metrics.
          </p>
        </section>

        <section>
          <h3 style={headingStyle}>Time</h3>
          <p style={bodyStyle}>
            Time estimates how long the item may take to process, based on reading
            load and the number of reasoning steps. It is normalized to 0–1. High
            time scores may indicate items that create pacing pressure for students
            working under time constraints.
          </p>
        </section>

        <section>
          <h3 style={headingStyle}>Vocabulary Heatmap</h3>
          <p style={bodyStyle}>
            The heatmap shows how many easy (green), moderate (yellow), and
            difficult (red) words appear in each item. Word difficulty is determined
            by syllable count: 1 syllable = easy, 2 = moderate, 3 or more = difficult.
            Items with many red bars may create vocabulary barriers for ELL students
            or developing readers.
          </p>
        </section>
      </div>

      <p
        style={{
          marginTop: "1.5rem",
          fontSize: "0.75rem",
          color: "#9ca3af",
          borderTop: "1px solid #e5e7eb",
          paddingTop: "0.75rem",
        }}
      >
        All metrics are computed locally — no AI generation involved. Results
        are deterministic and reproducible for the same document.
      </p>
    </div>
  );
}

const headingStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "0.25rem",
};

const bodyStyle: React.CSSProperties = {
  color: "#6b7280",
  margin: 0,
};
