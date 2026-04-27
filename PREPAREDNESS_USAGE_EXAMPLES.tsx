/**
 * USAGE EXAMPLES — Preparedness Feature
 * 
 * Copy-paste ready examples for integrating the Preparedness feature
 * into your application.
 */

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 1: Add as Standalone Page
// ═══════════════════════════════════════════════════════════════════════════

/**
 * In your App.tsx or routing setup:
 */
import { PreparednessPage } from "@/components_new/v4/PreparednessPage";

export function AppWithPreparedness() {
  return (
    <Routes>
      {/* ...other routes... */}
      <Route path="/preparedness" element={<PreparednessPage />} />
    </Routes>
  );
}

/**
 * Now users can navigate to /preparedness to access the full feature.
 */

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 2: Add as Tab in TeacherStudio
// ═══════════════════════════════════════════════════════════════════════════

import { PreparednessPage } from "@/components_new/v4/PreparednessPage";
import { useState } from "react";

export function TeacherStudioWithPreparedness() {
  const [activeTab, setActiveTab] = useState<
    "documents" | "classroom" | "preparedness"
  >("documents");

  return (
    <div>
      {/* Tab Navigation */}
      <div style={{ display: "flex", borderBottom: "2px solid #ddd" }}>
        <button
          onClick={() => setActiveTab("documents")}
          style={{
            padding: "12px 24px",
            borderBottom: activeTab === "documents" ? "3px solid #0066cc" : "none",
            backgroundColor: activeTab === "documents" ? "#f0f6ff" : "white",
            cursor: "pointer",
            fontWeight: activeTab === "documents" ? "600" : "400",
          }}
        >
          Documents
        </button>
        <button
          onClick={() => setActiveTab("classroom")}
          style={{
            padding: "12px 24px",
            borderBottom: activeTab === "classroom" ? "3px solid #0066cc" : "none",
            backgroundColor: activeTab === "classroom" ? "#f0f6ff" : "white",
            cursor: "pointer",
            fontWeight: activeTab === "classroom" ? "600" : "400",
          }}
        >
          Classroom
        </button>
        <button
          onClick={() => setActiveTab("preparedness")}
          style={{
            padding: "12px 24px",
            borderBottom: activeTab === "preparedness" ? "3px solid #0066cc" : "none",
            backgroundColor: activeTab === "preparedness" ? "#f0f6ff" : "white",
            cursor: "pointer",
            fontWeight: activeTab === "preparedness" ? "600" : "400",
          }}
        >
          Preparedness
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ padding: "2rem" }}>
        {activeTab === "documents" && <DocumentsContent />}
        {activeTab === "classroom" && <ClassroomContent />}
        {activeTab === "preparedness" && <PreparednessPage />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 3: Inline Access via Hook (Custom UI)
// ═══════════════════════════════════════════════════════════════════════════

import { usePreparedness } from "@/hooks/usePreparedness";
import { AlignmentTable } from "@/components_new/v4/AlignmentTable";
import { SuggestionsPanel } from "@/components_new/v4/SuggestionsPanel";
import { RewriteOutput } from "@/components_new/v4/RewriteOutput";

export function CustomPreparednessWorkflow() {
  const {
    alignment,
    suggestions,
    rewrite,
    loading,
    errors,
    selectedSuggestions,
    startAlignment,
    fetchSuggestions,
    applyRewritePhase,
    toggleSuggestion,
    reset,
  } = usePreparedness({
    onAlignmentComplete: (alignment) => {
      console.log("Alignment complete:", alignment);
    },
    onSuggestionsComplete: (suggestions) => {
      console.log("Suggestions generated:", suggestions);
    },
    onRewriteComplete: (rewrite) => {
      console.log("Rewrite complete:", rewrite);
    },
  });

  const handleAnalyzeClick = async () => {
    const prep = {
      title: "Chapter 5: Z-Scores",
      rawText: "A z-score is a standardized measure showing how many standard deviations a value is from the mean...",
    };

    const assessment = {
      title: "Quiz 5",
      items: [
        { itemNumber: 1, text: "What is a z-score?" },
        { itemNumber: 2, text: "Calculate z-score for value 75 with mean 70 and std 5" },
        { itemNumber: 3, text: "Evaluate whether this z-score indicates statistical significance" },
      ],
    };

    await startAlignment(prep, assessment);
  };

  const handleGenerateSuggestions = async () => {
    if (!alignment) return;
    await fetchSuggestions(alignment);
  };

  const handleApplySuggestions = async () => {
    if (!suggestions) return;
    const selected = Array.from(selectedSuggestions).map((i) => suggestions[i]);
    await applyRewritePhase({ title: "Quiz 5", items: [] }, selected);
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      <h1>Custom Preparedness Workflow</h1>

      {/* Step 1: Analyze */}
      <section style={{ marginBottom: "3rem", padding: "1.5rem", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
        <h2>Step 1: Analyze Alignment</h2>
        <button
          onClick={handleAnalyzeClick}
          disabled={loading.alignment}
          style={{
            padding: "10px 20px",
            backgroundColor: "#0066cc",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {loading.alignment ? "Analyzing..." : "Analyze Documents"}
        </button>

        {errors.alignment && <div style={{ color: "red", marginTop: "1rem" }}>{errors.alignment}</div>}

        {alignment && (
          <div style={{ marginTop: "1rem" }}>
            <AlignmentTable alignment={alignment} />
          </div>
        )}
      </section>

      {/* Step 2: Get Suggestions */}
      {alignment && (
        <section style={{ marginBottom: "3rem", padding: "1.5rem", backgroundColor: "#fff3e0", borderRadius: "8px" }}>
          <h2>Step 2: Generate Suggestions</h2>
          <button
            onClick={handleGenerateSuggestions}
            disabled={loading.suggestions}
            style={{
              padding: "10px 20px",
              backgroundColor: "#ff9800",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {loading.suggestions ? "Generating..." : "Generate Suggestions"}
          </button>

          {errors.suggestions && <div style={{ color: "red", marginTop: "1rem" }}>{errors.suggestions}</div>}

          {suggestions && (
            <div style={{ marginTop: "1rem" }}>
              <SuggestionsPanel
                suggestions={suggestions}
                selectedSuggestions={selectedSuggestions}
                onToggleSuggestion={toggleSuggestion}
              />
            </div>
          )}
        </section>
      )}

      {/* Step 3: Apply Rewrite */}
      {suggestions && selectedSuggestions.size > 0 && (
        <section style={{ marginBottom: "3rem", padding: "1.5rem", backgroundColor: "#e8f5e9", borderRadius: "8px" }}>
          <h2>Step 3: Apply Rewrite</h2>
          <button
            onClick={handleApplySuggestions}
            disabled={loading.rewrite}
            style={{
              padding: "10px 20px",
              backgroundColor: "#4caf50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {loading.rewrite ? "Rewriting..." : `Apply ${selectedSuggestions.size} Suggestion(s)`}
          </button>

          {errors.rewrite && <div style={{ color: "red", marginTop: "1rem" }}>{errors.rewrite}</div>}

          {rewrite && (
            <div style={{ marginTop: "1rem" }}>
              <RewriteOutput rewrite={rewrite} originalAssessment={{ title: "Quiz 5", items: [] }} />
            </div>
          )}
        </section>
      )}

      {/* Reset Button */}
      {(alignment || suggestions || rewrite) && (
        <button
          onClick={reset}
          style={{
            padding: "10px 20px",
            backgroundColor: "#ddd",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Start Over
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 4: Direct Service Usage (No Hook)
// ═══════════════════════════════════════════════════════════════════════════

import {
  getAlignment,
  getSuggestions,
  applyRewrite,
} from "@/services_new/preparednessService";

async function runPreparednessAnalysis() {
  const prep = {
    title: "Prep Materials",
    rawText: "Content about z-scores...",
  };

  const assessment = {
    title: "Assessment",
    items: [
      { itemNumber: 1, text: "Define z-score" },
      { itemNumber: 2, text: "Calculate z-score" },
    ],
  };

  try {
    // Phase 1
    console.log("Getting alignment...");
    const alignment = await getAlignment(prep, assessment);
    console.log("Alignment:", alignment);

    // Phase 2
    console.log("Getting suggestions...");
    const suggestions = await getSuggestions(alignment);
    console.log("Suggestions:", suggestions);

    // Phase 3 (user selects suggestions 0 and 2)
    console.log("Applying rewrite...");
    const rewrite = await applyRewrite(assessment, [suggestions[0], suggestions[2]]);
    console.log("Rewrite:", rewrite);
  } catch (error) {
    console.error("Error:", error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 5: Button to Trigger Preparedness for Current Document
// ═══════════════════════════════════════════════════════════════════════════

import { useNavigate } from "react-router-dom";

interface DocumentViewerProps {
  prepId: string;
  assessmentId: string;
}

export function DocumentViewerWithPreparedness({
  prepId,
  assessmentId,
}: DocumentViewerProps) {
  const navigate = useNavigate();

  const handleAnalyzePreparedness = () => {
    // Could pass data via URL params or context
    navigate(`/preparedness?prep=${prepId}&assessment=${assessmentId}`);
  };

  return (
    <div>
      <h1>View Documents</h1>
      {/* Document display... */}

      <button
        onClick={handleAnalyzePreparedness}
        style={{
          padding: "10px 20px",
          backgroundColor: "#0066cc",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          marginTop: "1rem",
        }}
      >
        Analyze Preparedness
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 6: Pre-load Documents into PreparednessPage
// ═══════════════════════════════════════════════════════════════════════════

import { PreparednessPage } from "@/components_new/v4/PreparednessPage";

export function AnalyzeClass Assignment() {
  const classAssignment = {
    prep: {
      title: "Week 3 Lesson",
      rawText: `
        This week we learned about z-scores and standardized distributions.
        Key concepts:
        - Z-scores normalize data across different scales
        - Formula: (X - mean) / standard deviation
        - Used for comparing values from different distributions
      `,
    },
    assessment: {
      title: "Week 3 Quiz",
      items: [
        { itemNumber: 1, text: "Define a z-score in your own words" },
        { itemNumber: 2, text: "Calculate the z-score for a value in a complex scenario" },
        { itemNumber: 3, text: "Compare z-scores from two different datasets" },
      ],
    },
  };

  return (
    <PreparednessPage
      prep={classAssignment.prep}
      assessment={classAssignment.assessment}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// All examples are ready to copy and use. Pick whichever fits your workflow!
// ═══════════════════════════════════════════════════════════════════════════
