import "./inference.css";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent
} from "@/components/ui/collapsible";

export default function WhatWeInfer() {
  return (
    <div className="inference-page">
      <h1 style={{ marginBottom: "24px" }}>What We Infer</h1>

      {/* ============================================================
          1. WHEN WRITING ASSESSMENTS
      ============================================================ */}
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger className="collapsible-trigger">
          <span className="arrow">▶</span>
          When Writing Assessments
        </CollapsibleTrigger>

        <CollapsibleContent className="collapsible-content">
          <div className="inference-grid">

            {/* Course */}
            <div className="inference-card">
              <div className="inference-card-header"><strong>Course Name</strong></div>
              <ul className="inference-card-text">
                <li>• Infers subject, grade band, standards, and representations.</li>
                <li>• Determines typical Bloom’s distribution.</li>
                <li>• AP courses → shapes questions to resemble AP exam FRQs.</li>
              </ul>
            </div>

            {/* Unit */}
            <div className="inference-card">
              <div className="inference-card-header"><strong>Unit / Topic</strong></div>
              <ul className="inference-card-text">
                <li>• Infers key concepts, vocabulary, skills, and misconceptions.</li>
                <li>• Determines typical question types and DOK.</li>
                <li>• Infers Bloom’s level appropriate for the topic.</li>
              </ul>
            </div>

            {/* Student Level */}
            <div className="inference-card">
              <div className="inference-card-header"><strong>Student Level</strong></div>
              <ul className="inference-card-text">
                <li>• Calibrates difficulty, scaffolding, and reading level.</li>
                <li>• Sets Bloom’s floor/ceiling.</li>
                <li>• AP → adjusts Bloom’s to AP expectations.</li>
              </ul>
            </div>

            {/* Assessment Type */}
            <div className="inference-card">
              <div className="inference-card-header"><strong>Assessment Type</strong></div>
              <ul className="inference-card-text">
                <li>• Infers number of questions, pacing, and structure.</li>
                <li>• Determines formative vs summative.</li>
                <li>• Infers Bloom’s distribution for the assessment type.</li>
              </ul>
            </div>

            {/* Time */}
            <div className="inference-card">
              <div className="inference-card-header"><strong>Time</strong></div>
              <ul className="inference-card-text">
                <li>• Infers total question count and time per question.</li>
                <li>• Determines feasibility of multi‑part items.</li>
                <li>• Infers Bloom’s level feasible within time constraints.</li>
              </ul>
            </div>

            {/* Uploads */}
            <div className="inference-card">
              <div className="inference-card-header"><strong>Uploads</strong></div>
              <ul className="inference-card-text">
                <li>• Summarizes source docs to determine what was taught.</li>
                <li>• Matches tone and format of example tests.</li>
                <li>• Infers Bloom’s level from example test question types.</li>
                <li>• Ensures test items align with review content.</li>
              </ul>
            </div>

            {/* Comments */}
            <div className="inference-card">
              <div className="inference-card-header"><strong>Additional Comments</strong></div>
              <ul className="inference-card-text">
                <li>• Infers emphasis, constraints, and special instructions.</li>
                <li>• Allows teachers to specify preferred Bloom’s level.</li>
                <li>• Overrides or fine‑tunes any automatic inference.</li>
              </ul>
            </div>

          </div>
        </CollapsibleContent>
      </Collapsible>


      {/* ============================================================
          2. WHEN GENERATING STUDENTS
      ============================================================ */}
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger className="collapsible-trigger">
          <span className="arrow">▶</span>
          When Generating Students
        </CollapsibleTrigger>

        <CollapsibleContent className="collapsible-content">
          <div className="inference-grid">

            {/* Grade Band */}
            <div className="inference-card">
              <div className="inference-card-header"><strong>Grade Band</strong></div>
              <ul className="inference-card-text">
                <li>• Sets baseline reading, math, reasoning, stamina.</li>
                <li>• Determines confusion tolerance and cognitive ranges.</li>
              </ul>
            </div>

            {/* Class Level */}
            <div className="inference-card">
              <div className="inference-card-header"><strong>Class Level</strong></div>
              <ul className="inference-card-text">
                <li>• Scales all cognitive stats.</li>
                <li>• Standard = ×1.0, Honors = ×1.10, AP = ×1.20.</li>
              </ul>
            </div>

            {/* Subject */}
            <div className="inference-card">
              <div className="inference-card-header"><strong>Subject</strong></div>
              <ul className="inference-card-text">
                <li>• Boosts subject‑specific skills.</li>
                <li>• Shapes which traits matter most in simulation.</li>
              </ul>
            </div>

            {/* Overlays */}
            <div className="inference-card">
              <div className="inference-card-header"><strong>Overlays</strong></div>
              <ul className="inference-card-text">
                <li>• Applies accessibility modifiers (ADHD, dyslexia, ESL, anxiety).</li>
                <li>• Adjusts stamina, reading, reasoning, confidence.</li>
              </ul>
            </div>

            {/* Base Stats */}
            <div className="inference-card">
              <div className="inference-card-header"><strong>Base Stats</strong></div>
              <ul className="inference-card-text">
                <li>• Generates readingLevel, reasoningLevel, mathFluency.</li>
                <li>• Derived from baselines + multipliers + overlays.</li>
              </ul>
            </div>

            {/* Simulation Behavior */}
            <div className="inference-card">
              <div className="inference-card-header"><strong>Simulation Behavior</strong></div>
              <ul className="inference-card-text">
                <li>• Predicts success, time, confusion, engagement.</li>
                <li>• Flags students at risk of not finishing.</li>
              </ul>
            </div>

            {/* Scoring Rules */}
            <div className="inference-card">
              <div className="inference-card-header"><strong>Scoring Rules</strong></div>
              <ul className="inference-card-text">
                <li>• Controls how all stats are calculated.</li>
                <li>• Produces realistic student personas.</li>
              </ul>
            </div>

          </div>
        </CollapsibleContent>
      </Collapsible>


      {/* ============================================================
          3. WHAT EACH INPUT DOES
      ============================================================ */}
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger className="collapsible-trigger">
          <span className="arrow">▶</span>
          What Each Input Does
        </CollapsibleTrigger>

        <CollapsibleContent className="collapsible-content">
          <div className="inference-grid">

            {/* Grade Levels */}
            <div className="inference-card">
              <div className="inference-card-header"><strong>Grade Levels</strong></div>
              <ul className="inference-card-text">
                <li>• Sets reading load, vocabulary, and age‑appropriate contexts.</li>
                <li>• Helps calibrate typical misconceptions.</li>
              </ul>
            </div>

            {/* Course */}
            <div className="inference-card">
              <div className="inference-card-header"><strong>Course</strong></div>
              <ul className="inference-card-text">
                <li>• Establishes subject domain and standards.</li>
                <li>• Guides terminology and representations.</li>
              </ul>
            </div>

            {/* Unit */}
            <div className="inference-card">
              <div className="inference-card-header"><strong>Unit / Topic</strong></div>
              <ul className="inference-card-text">
                <li>• Defines concepts, skills, and vocabulary.</li>
                <li>• Anchors question content and misconceptions.</li>
              </ul>
            </div>

            {/* Student Level */}
            <div className="inference-card">
              <div className="inference-card-header"><strong>Student Level</strong></div>
              <ul className="inference-card-text">
                <li>• Adjusts scaffolding, abstraction, and reasoning load.</li>
                <li>• Controls independence vs guided steps.</li>
              </ul>
            </div>

            {/* Assessment Type */}
            <div className="inference-card">
              <div className="inference-card-header"><strong>Assessment Type</strong></div>
              <ul className="inference-card-text">
                <li>• Determines structure, pacing, and question types.</li>
                <li>• Shapes cognitive load and expectations.</li>
              </ul>
            </div>

            {/* Time */}
            <div className="inference-card">
              <div className="inference-card-header"><strong>Time</strong></div>
              <ul className="inference-card-text">
                <li>• Sets question count and depth.</li>
                <li>• Limits multi‑part or extended reasoning items.</li>
              </ul>
            </div>

            {/* Source Documents */}
            <div className="inference-card">
              <div className="inference-card-header"><strong>Source Documents</strong></div>
              <ul className="inference-card-text">
                <li>• Summarized to determine what was taught.</li>
                <li>• Extracts vocabulary, concepts, and representations.</li>
                <li>• Prevents hallucinations by grounding content.</li>
                <li>• Supports multiple uploads.</li>
              </ul>
            </div>

            {/* Example Tests */}
            <div className="inference-card">
              <div className="inference-card-header"><strong>Example Tests</strong></div>
              <ul className="inference-card-text">
                <li>• Matches tone, structure, and difficulty.</li>
                <li>• Learns formatting and question style.</li>
                <li>• Supports multiple uploads + pasted text.</li>
              </ul>
            </div>

            {/* Additional Details */}
            <div className="inference-card">
              <div className="inference-card-header"><strong>Additional Details</strong></div>
              <ul className="inference-card-text">
                <li>• Overrides inference with teacher intent.</li>
                <li>• Adds constraints, misconceptions, or “avoid this” rules.</li>
                <li>• Helps personalize the assessment.</li>
              </ul>
            </div>

          </div>
        </CollapsibleContent>
      </Collapsible>

    </div>
  );
}
