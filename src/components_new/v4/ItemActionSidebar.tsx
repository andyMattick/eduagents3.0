import React from "react";

export type ItemAction =
  | "rewrite"
  | "easier"
  | "harder"
  | "context"
  | "type"
  | "subparts";

function actionLabel(action: ItemAction): string {
  if (action === "rewrite") return "Rewrite";
  if (action === "easier") return "Make Easier";
  if (action === "harder") return "Make Harder";
  if (action === "context") return "Change Context";
  if (action === "type") return "Change Item Type";
  return "Add/Remove Subparts";
}

interface ItemActionSidebarProps {
  itemIndex: number;
  isSelected: boolean;
  onToggleSelected: (itemIndex: number) => void;
  onAction: (itemIndex: number, action: ItemAction) => void;
}

export function ItemActionSidebar({ itemIndex, isSelected, onToggleSelected, onAction }: ItemActionSidebarProps) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.55rem" }}>
      <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", marginRight: "0.2rem", fontSize: "0.8rem", color: "#6b5040" }}>
        <input type="checkbox" checked={isSelected} onChange={() => onToggleSelected(itemIndex)} />
        Select
      </label>
      {(["rewrite", "easier", "harder", "context", "type", "subparts"] as ItemAction[]).map((action) => (
        <button
          key={`${itemIndex}-${action}`}
          type="button"
          className="v4-button v4-button-secondary v4-button-sm"
          onClick={() => onAction(itemIndex, action)}
        >
          {actionLabel(action)}
        </button>
      ))}
    </div>
  );
}
