import { ShortCircuitPage } from "./ShortCircuitPage";

interface SimulationPageProps {
  navigate: (path: string) => void;
}

export function SimulationPage({ navigate }: SimulationPageProps) {
  return (
    <section>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          padding: "0.8rem 1rem",
          borderRadius: "12px",
          border: "1px solid rgba(86,57,32,0.16)",
          background: "rgba(255,251,245,0.9)",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <p style={{ margin: 0, color: "#6b5040", fontSize: "0.88rem" }}>
          Run simulation from uploaded documents, then create a class when you are ready.
        </p>
        <button
          type="button"
          className="v4-button"
          onClick={() => navigate("/classes/new")}
        >
          Create a Class
        </button>
      </div>

      <ShortCircuitPage />
    </section>
  );
}
