/**
 * Suggestions Panel Component
 * 
 * Displays actionable suggestions from alignment analysis as selectable cards.
 * Teachers can choose which suggestions to apply in the rewrite phase.
 */

import React, { useEffect } from "react";
import type {
  SuggestionType,
  SuggestionsResult,
} from "../../prism-v4/schema/domain/Preparedness";
import {
  getSuggestionTypeLabel,
} from "../../services_new/preparednessService";
import "./v4.css";

interface SuggestionsPanelProps {
  suggestions: SuggestionsResult;
  selectedSuggestions: Set<number>; // track by index
  selectedFixes?: Record<number, SuggestionType | undefined>;
  onToggleSuggestion: (index: number) => void;
  onSelectFix?: (assessmentItemNumber: number, fixType: "remove_question" | "add_prep_support") => void;
  onChangeFinalSuggestions?: (finalSuggestions: SuggestionsResult) => void;
  isLoading?: boolean;
}

const getIssueColor = (issue: string): string => {
  switch (issue) {
    case "missing_in_prep":
      return "#ff6b6b";
    case "misaligned_above":
      return "#ffa726";
    default:
      return "#999";
  }
};

const getTypeIcon = (type: string): string => {
  switch (type) {
    case "remove_question":
      return "✕";
    case "lower_bloom_level":
      return "↓";
    case "add_prep_support":
      return "+";
    case "raise_prep_level":
      return "↑";
    default:
      return "•";
  }
};

export const SuggestionsPanel: React.FC<SuggestionsPanelProps> = ({
  suggestions,
  selectedSuggestions,
  selectedFixes,
  onToggleSuggestion,
  onSelectFix,
  onChangeFinalSuggestions,
  isLoading = false,
}) => {
  useEffect(() => {
    if (!onChangeFinalSuggestions) {
      return;
    }

    const finalSuggestions = suggestions.map((suggestion) => ({
      ...suggestion,
      suggestionType:
        selectedFixes?.[suggestion.assessmentItemNumber] ?? suggestion.suggestionType,
    })) as SuggestionsResult;

    onChangeFinalSuggestions(finalSuggestions);
  }, [onChangeFinalSuggestions, selectedFixes, suggestions]);

  if (suggestions.length === 0) {
    return (
      <div
        style={{
          marginTop: "2rem",
          padding: "2rem",
          backgroundColor: "#e8f5e9",
          borderRadius: "8px",
          textAlign: "center",
        }}
      >
        <h3 style={{ margin: "0 0 0.5rem 0", color: "#2e7d32" }}>✓ All Aligned</h3>
        <p style={{ margin: 0, color: "#558b2f" }}>
          Your assessment and prep document are well-aligned. No changes suggested.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "2rem" }}>
      <h3 style={{ marginBottom: "1.5rem", fontSize: "1.25rem", fontWeight: "600" }}>
        Suggested Fixes ({suggestions.length})
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(450px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {suggestions.map((suggestion, idx) => (
          <div
            key={idx}
            style={{
              border: selectedSuggestions.has(idx)
                ? "2px solid #0066cc"
                : "1px solid #ddd",
              borderRadius: "8px",
              padding: "1rem",
              backgroundColor: selectedSuggestions.has(idx) ? "#f0f6ff" : "#f9fafb",
              cursor: "pointer",
              transition: "all 0.2s",
              opacity: isLoading ? 0.6 : 1,
              pointerEvents: isLoading ? "none" : "auto",
            }}
            onClick={() => onToggleSuggestion(idx)}
          >
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                padding: "1rem",
                backgroundColor: "#fff",
              }}
            >
              <h3 style={{ margin: "0 0 8px 0", fontWeight: 600, fontSize: "1.1rem" }}>
                Question {suggestion.assessmentItemNumber}
                {suggestion.issue === "missing_in_prep" && (
                  <span
                    style={{
                      marginLeft: "8px",
                      fontSize: "0.72rem",
                      backgroundColor: "#fee2e2",
                      color: "#b91c1c",
                      padding: "3px 8px",
                      borderRadius: "9999px",
                      textTransform: "uppercase",
                      letterSpacing: "0.2px",
                    }}
                  >
                    Action required
                  </span>
                )}
              </h3>

            {/* Checkbox and Issue Type */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                marginBottom: "12px",
              }}
            >
              <input
                type="checkbox"
                checked={selectedSuggestions.has(idx)}
                onChange={() => {}}
                style={{
                  width: "20px",
                  height: "20px",
                  marginTop: "2px",
                  cursor: "pointer",
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "1.2rem",
                      color: getIssueColor(suggestion.issue),
                      fontWeight: "bold",
                    }}
                  >
                    {getTypeIcon(suggestion.suggestionType)}
                  </span>
                </div>
                <p
                  style={{
                    margin: "0",
                    fontSize: "0.85rem",
                    color: "#666",
                    fontWeight: "500",
                  }}
                >
                  {getSuggestionTypeLabel(suggestion.suggestionType)}
                </p>
              </div>
            </div>

            {/* Issue Label */}
            <div style={{ marginBottom: "12px" }}>
              <p
                style={{
                  margin: "0 0 8px 0",
                  fontSize: "0.9rem",
                  color: getIssueColor(suggestion.issue),
                  fontWeight: "500",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {suggestion.issue === "missing_in_prep" ? "Missing in Prep" : "Above Prep Level"}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.95rem",
                  color: "#555",
                  lineHeight: "1.4",
                }}
              >
                {getSuggestionTypeLabel(suggestion.suggestionType)}
              </p>
            </div>

            {suggestion.issue === "missing_in_prep" && onSelectFix && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "10px 12px",
                  backgroundColor: "#f9fbff",
                  border: "1px solid #dbe7ff",
                  borderRadius: "6px",
                }}
                onClick={(event) => event.stopPropagation()}
              >
                <p style={{ margin: "0 0 8px 0", fontSize: "0.85rem", fontWeight: 600 }}>
                  How do you want to fix this?
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem" }}>
                    <input
                      type="radio"
                      name={`choice-${suggestion.assessmentItemNumber}`}
                      value="remove_question"
                      checked={
                        (selectedFixes?.[suggestion.assessmentItemNumber] ?? suggestion.suggestionType) ===
                        "remove_question"
                      }
                      onChange={() =>
                        onSelectFix(suggestion.assessmentItemNumber, "remove_question")
                      }
                    />
                    Remove this test question
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem" }}>
                    <input
                      type="radio"
                      name={`choice-${suggestion.assessmentItemNumber}`}
                      value="add_prep_support"
                      checked={
                        (selectedFixes?.[suggestion.assessmentItemNumber] ?? suggestion.suggestionType) ===
                        "add_prep_support"
                      }
                      onChange={() =>
                        onSelectFix(suggestion.assessmentItemNumber, "add_prep_support")
                      }
                    />
                    Add this concept to the review
                  </label>
                </div>
              </div>
            )}

            {/* Visual indicator */}
            {selectedSuggestions.has(idx) && (
              <div style={{ marginTop: "12px", textAlign: "right" }}>
                <span
                  style={{
                    display: "inline-block",
                    backgroundColor: "#0066cc",
                    color: "white",
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                  }}
                >
                  Selected
                </span>
              </div>
            )}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          backgroundColor: "#f5f5f5",
          borderRadius: "8px",
        }}
      >
        <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", fontWeight: "600" }}>
          Selected: {selectedSuggestions.size} of {suggestions.length}
        </p>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "#666" }}>
          Choose which suggestions to apply to the assessment and/or prep document.
        </p>
      </div>
    </div>
  );
};
