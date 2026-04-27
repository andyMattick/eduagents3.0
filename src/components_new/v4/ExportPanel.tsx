import React from "react";

interface ExportPanelProps {
  modeLabel: string;
  onExportStudent: () => void;
  onExportAnswer: () => void;
}

export function ExportPanel({ modeLabel, onExportStudent, onExportAnswer }: ExportPanelProps) {
  return (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.8rem" }}>
      <button type="button" className="v4-button v4-button-secondary" onClick={onExportStudent}>
        Export Student Version ({modeLabel})
      </button>
      <button type="button" className="v4-button v4-button-secondary" onClick={onExportAnswer}>
        Export Answer Key ({modeLabel})
      </button>
    </div>
  );
}
