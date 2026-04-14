import React from "react";

interface BlueprintHeaderProps {
  title?: string;
  description?: string;
}

export function BlueprintHeader({
  title = "Instructional Alignment",
  description = "This analysis shows what was taught, what was tested, and where the gaps are.",
}: BlueprintHeaderProps) {
  return (
    <div style={{ marginTop: "0.75rem", marginBottom: "1.1rem" }}>
      <p className="v4-kicker" style={{ marginBottom: "0.4rem" }}>{title}</p>
      <p className="v4-body-copy" style={{ marginTop: 0, fontSize: "0.86rem", color: "#6b5040" }}>
        {description}
      </p>
    </div>
  );
}
