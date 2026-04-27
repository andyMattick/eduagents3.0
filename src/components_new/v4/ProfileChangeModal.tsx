import React from "react";

interface ProfileChangeModalProps {
  open: boolean;
  profileLabel: string;
  onRegenerateAll: () => void;
  onAdjustSelected: () => void;
  onClose: () => void;
}

export function ProfileChangeModal({ open, profileLabel, onRegenerateAll, onAdjustSelected, onClose }: ProfileChangeModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.4)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
    >
      <div style={{ background: "#fff", borderRadius: "16px", padding: "1rem", width: "min(520px, 100%)" }}>
        <p className="v4-kicker" style={{ marginBottom: "0.35rem" }}>Profile changed to {profileLabel}</p>
        <p style={{ margin: 0, color: "#6b5040" }}>Regenerate entire document or adjust selected items?</p>
        <div style={{ marginTop: "0.9rem", display: "flex", gap: "0.5rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" className="v4-button v4-button-secondary" onClick={onAdjustSelected}>Adjust Selected Items</button>
          <button type="button" className="v4-button" onClick={onRegenerateAll}>Regenerate All</button>
          <button type="button" className="v4-button v4-button-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
