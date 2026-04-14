import { useState } from "react";
import type { GeneratedTestData, GeneratedTestItem } from "../../types/simulator";
import { ExportPanel } from "./ExportPanel";
import { ItemActionSidebar, type ItemAction } from "./ItemActionSidebar";
import { ProfileChangeModal } from "./ProfileChangeModal";
import { ViewerTopBar, type LengthTuning } from "./ViewerTopBar";

interface GeneratedViewerProps {
  modeLabel: string;
  data: GeneratedTestData;
  profileOptions: readonly string[];
  teacherProfileLabel: string;
  lengthTuning: LengthTuning;
  onProfileChange: (profile: string) => void;
  onLengthChange: (value: LengthTuning) => void;
  onRegenerateAll: () => void;
  onItemAction: (item: GeneratedTestItem, index: number, action: ItemAction) => void;
  onBulkItemAction: (indexes: number[], action: ItemAction) => void;
  onExportStudent: () => void;
  onExportAnswer: () => void;
}

export function GeneratedViewer(props: GeneratedViewerProps) {
  const {
    modeLabel,
    data,
    profileOptions,
    teacherProfileLabel,
    lengthTuning,
    onProfileChange,
    onLengthChange,
    onRegenerateAll,
    onItemAction,
    onBulkItemAction,
    onExportStudent,
    onExportAnswer,
  } = props;

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [pendingProfile, setPendingProfile] = useState(teacherProfileLabel);
  const [selectedByIndex, setSelectedByIndex] = useState<Record<number, boolean>>({});
  const [bulkAction, setBulkAction] = useState<ItemAction | "">("");

  function toggleItemSelection(itemIndex: number) {
    setSelectedByIndex((prev) => ({ ...prev, [itemIndex]: !prev[itemIndex] }));
  }

  const selectedIndexes = data.test
    .map((_, index) => index)
    .filter((index) => Boolean(selectedByIndex[index]));

  return (
    <div
      style={{
        marginTop: "1.5rem",
        padding: "1rem 1.1rem",
        border: "1px solid rgba(86,57,32,0.16)",
        borderRadius: "14px",
        background: "rgba(255,251,245,0.75)",
      }}
    >
      <p className="v4-kicker" style={{ marginBottom: "0.6rem" }}>{modeLabel} Viewer</p>

      <div className="review-viewer-topbar">
        <ViewerTopBar
          profileOptions={profileOptions}
          teacherProfileLabel={teacherProfileLabel}
          lengthTuning={lengthTuning}
          onProfileChange={(profile) => {
            setPendingProfile(profile);
            setShowProfileModal(true);
          }}
          onLengthChange={onLengthChange}
        />

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.8rem", flexWrap: "wrap" }}>
          <button type="button" className="v4-button" onClick={onRegenerateAll}>Regenerate All</button>
        </div>
      </div>

      <ExportPanel modeLabel={modeLabel} onExportStudent={onExportStudent} onExportAnswer={onExportAnswer} />

      {selectedIndexes.length > 0 && (
        <div style={{ marginTop: "0.85rem", border: "1px solid rgba(86,57,32,0.18)", borderRadius: "10px", padding: "0.8rem", background: "rgba(255,255,255,0.72)" }}>
          <p className="v4-kicker" style={{ marginBottom: "0.45rem" }}>Rewrite All Selected</p>
          <p style={{ margin: "0 0 0.55rem", fontSize: "0.82rem", color: "#6b5040" }}>
            Selected items: {selectedIndexes.map((index) => index + 1).join(", ")}
          </p>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value as ItemAction | "")}>
              <option value="">Choose an action...</option>
              <option value="rewrite">Rewrite</option>
              <option value="easier">Make Easier</option>
              <option value="harder">Make Harder</option>
              <option value="context">Change Context</option>
              <option value="type">Change Item Type</option>
              <option value="subparts">Add/Remove Subparts</option>
            </select>
            <button
              type="button"
              className="v4-button"
              disabled={bulkAction === ""}
              onClick={() => {
                if (!bulkAction) return;
                onBulkItemAction(selectedIndexes, bulkAction);
              }}
            >
              Apply to All Selected
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: "1.5rem" }}>
        <p className="v4-kicker" style={{ marginBottom: "0.75rem" }}>Generated Test — {data.test.length} items</p>
        <ol style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {data.test.map((item, i) => (
            <li key={i} style={{ fontSize: "0.875rem", lineHeight: 1.65 }}>
              <span className="v4-pill" style={{ marginRight: "0.5rem", fontSize: "0.7rem", verticalAlign: "middle" }}>
                {item.type}
              </span>
              <span style={{ fontWeight: 600 }}>{item.stem}</span>
              {item.options && item.options.length > 0 && (
                <ol type="A" style={{ marginTop: "0.35rem", paddingLeft: "1.5rem" }}>
                  {item.options.map((opt, j) => <li key={j}>{opt}</li>)}
                </ol>
              )}
              {item.answer && (
                <p style={{ marginTop: "0.35rem", color: "#6b5040", fontSize: "0.8rem" }}>
                  <strong>Answer:</strong> {item.answer}
                </p>
              )}
              <ItemActionSidebar
                itemIndex={i}
                isSelected={Boolean(selectedByIndex[i])}
                onToggleSelected={toggleItemSelection}
                onAction={(itemIndex, action) => onItemAction(item, itemIndex, action)}
              />
            </li>
          ))}
        </ol>
      </div>

      <ProfileChangeModal
        open={showProfileModal}
        profileLabel={pendingProfile}
        onAdjustSelected={() => {
          onProfileChange(pendingProfile);
          setShowProfileModal(false);
        }}
        onRegenerateAll={() => {
          onProfileChange(pendingProfile);
          onRegenerateAll();
          setShowProfileModal(false);
        }}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
}
