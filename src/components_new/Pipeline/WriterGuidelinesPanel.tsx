/**
 * WriterGuidelinesPanel.tsx
 *
 * Shows teachers exactly what guidelines governed the Writer:
 *   - Their own inputs
 *   - System-derived constraints (Bloom band, pacing, type distribution)
 *   - Gatekeeper-added prescriptions from any violations
 *   - Revision overrides
 *   - Student-performance adjustments
 *   - The final merged list sent to the Writer
 *
 * Collapsible, tab-organised, and styled to match AssessmentViewer.
 */

import { useState } from "react";
import type { WriterContract } from "@/pipeline/contracts/WriterContract";
import "./WriterGuidelinesPanel.css";

type Tab = "overview" | "gatekeeper" | "guidelines" | "history";

function Badge({ text, variant = "neutral" }: { text: string; variant?: "green" | "amber" | "blue" | "neutral" }) {
  return <span className={`wgp-badge wgp-badge--${variant}`}>{text}</span>;
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="wgp-section">
      <h4 className="wgp-section-heading">{heading}</h4>
      {children}
    </div>
  );
}

function KVRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === "") return null;
  return (
    <div className="wgp-kv-row">
      <span className="wgp-kv-label">{label}</span>
      <span className="wgp-kv-value">{String(value)}</span>
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ contract }: { contract: WriterContract }) {
  const ti = contract.teacherIntent;
  const sc = contract.systemConstraints;

  const typeDist = Object.entries(sc.questionTypeDistribution)
    .map(([t, n]) => `${t} ×${n}`)
    .join(", ");

  return (
    <div className="wgp-tab-body">
      <Section heading="Teacher Inputs">
        <div className="wgp-kv-grid">
          <KVRow label="Course" value={ti.course} />
          <KVRow label="Topic" value={ti.topic} />
          <KVRow label="Grade" value={ti.grade} />
          <KVRow label="Time" value={ti.timeMinutes ? `${ti.timeMinutes} min` : null} />
          <KVRow label="Assessment type" value={ti.assessmentType} />
          <KVRow label="Question types" value={ti.questionTypes.join(", ")} />
          <KVRow label="Questions" value={ti.questionCount} />
          {ti.additionalDetails && (
            <div className="wgp-additional-details">
              <span className="wgp-kv-label">Additional details</span>
              <p className="wgp-additional-text">{ti.additionalDetails}</p>
            </div>
          )}
        </div>
      </Section>

      <Section heading="System Constraints">
        <div className="wgp-kv-grid">
          <KVRow label="Bloom band" value={`${sc.bloomFloor} → ${sc.bloomCeiling}`} />
          <KVRow label="Difficulty" value={sc.difficultyProfile} />
          <KVRow label="Pacing" value={`${sc.pacingSecondsPerItem}s / item`} />
          <KVRow label="Math format" value={sc.mathFormat} />
          <KVRow label="Type distribution" value={typeDist || "—"} />
          <KVRow
            label="Uniqueness enforced"
            value={sc.uniquenessRequired ? "Yes — per-slot topic angles" : "No"}
          />
          <KVRow
            label="JSON safety"
            value={sc.jsonSafety ? "Yes — quote escaping enforced" : "No"}
          />
          {sc.preferMultipleChoiceActivated && (
            <div className="wgp-notice wgp-notice--amber">
              ⚠ "Easy to grade" constraint detected — MC weighting was boosted automatically.
              Add specific question types to your prompt to override this.
            </div>
          )}
        </div>
      </Section>

      {contract.studentPerformanceAdjustments.length > 0 && (
        <Section heading="Student Performance Adjustments">
          {contract.studentPerformanceAdjustments.map((s, i) => (
            <div key={i} className="wgp-perf-entry">
              <span className="wgp-perf-score">
                ✓ {s.correct} correct / ✗ {s.incorrect} incorrect
              </span>
              <ul className="wgp-list">
                {s.adjustments.map((adj, j) => <li key={j}>{adj}</li>)}
              </ul>
              {s.misconceptions && s.misconceptions.length > 0 && (
                <p className="wgp-perf-misc">
                  Misconceptions addressed: {s.misconceptions.join("; ")}
                </p>
              )}
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

// ── Gatekeeper tab ────────────────────────────────────────────────────────────

function GatekeeperTab({ contract }: { contract: WriterContract }) {
  const gk = contract.gatekeeperPrescriptions;
  const clean = gk.violations.length === 0;

  return (
    <div className="wgp-tab-body">
      {clean ? (
        <div className="wgp-clean-banner">
          <span className="wgp-clean-icon">✓</span>
          <span>Clean run — no Gatekeeper violations were recorded.</span>
        </div>
      ) : (
        <>
          <Section heading={`Violations detected (${gk.violations.length})`}>
            <ul className="wgp-list wgp-list--amber">
              {[...new Set(gk.violations)].map((v, i) => (
                <li key={i}><code className="wgp-code">{v}</code></li>
              ))}
            </ul>
          </Section>

          <Section heading="Prescriptions added for next run">
            <p className="wgp-help-text">
              These rules will be injected into the Writer prompt the next time you generate.
            </p>
            <ul className="wgp-list wgp-list--blue">
              {gk.addedConstraints.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </Section>
        </>
      )}
    </div>
  );
}

// ── Final guidelines tab ──────────────────────────────────────────────────────

function GuidelinesTab({ contract }: { contract: WriterContract }) {
  const lines = contract.finalWriterGuidelines;

  if (lines.length === 0) {
    return (
      <div className="wgp-tab-body">
        <p className="wgp-help-text">
          Guidelines will appear here after the first generation.
        </p>
      </div>
    );
  }

  return (
    <div className="wgp-tab-body">
      <p className="wgp-help-text">
        The complete ordered list of rules that were sent to the Writer for this assessment.
      </p>
      <ol className="wgp-ordered-list">
        {lines.map((line, i) => {
          const isGatekeeper = line.startsWith("[Gatekeeper rule]");
          const isPerf = line.startsWith("[Student-performance]");
          const cls = isGatekeeper ? "wgp-guideline--amber" : isPerf ? "wgp-guideline--blue" : "";
          return (
            <li key={i} className={`wgp-guideline ${cls}`}>
              {line.replace(/^\[(Gatekeeper rule|Student-performance)\]\s*/, "")}
              {isGatekeeper && <Badge text="Gatekeeper" variant="amber" />}
              {isPerf && <Badge text="Student data" variant="blue" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ── History tab ───────────────────────────────────────────────────────────────

function HistoryTab({ contract }: { contract: WriterContract }) {
  const history = contract.revisionHistory;

  if (history.length === 0) {
    return (
      <div className="wgp-tab-body">
        <p className="wgp-help-text">No revisions have been made yet.</p>
      </div>
    );
  }

  return (
    <div className="wgp-tab-body">
      <ul className="wgp-history-list">
        {history.map((entry, i) => (
          <li key={i} className="wgp-history-entry">
            <span className="wgp-history-time">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
            <span className="wgp-history-field">{entry.field}</span>
            <span className="wgp-history-arrow">→</span>
            <span className="wgp-history-value">{String(entry.newValue)}</span>
            <Badge
              text={entry.reason}
              variant={
                entry.reason === "gatekeeperFix" ? "amber" :
                entry.reason === "jsonRepair" ? "amber" :
                entry.reason === "studentPerformance" ? "blue" : "neutral"
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface WriterGuidelinesPanelProps {
  contract: WriterContract;
}

export function WriterGuidelinesPanel({ contract }: WriterGuidelinesPanelProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const gatekeeperCount = contract.gatekeeperPrescriptions.violations.length;
  const hasGatekeeperViolations = gatekeeperCount > 0;

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview",    label: "Inputs & Constraints" },
    { id: "gatekeeper",  label: `Gatekeeper${hasGatekeeperViolations ? ` (${[...new Set(contract.gatekeeperPrescriptions.violations)].length})` : ""}` },
    { id: "guidelines",  label: "Final Guidelines" },
    { id: "history",     label: "Revisions" },
  ];

  return (
    <div className="wgp-root">
      <button className="wgp-toggle" onClick={() => setOpen((o) => !o)}>
        <span className="wgp-toggle-icon">📋</span>
        <span className="wgp-toggle-label">Writer Contract</span>
        {hasGatekeeperViolations && (
          <Badge text={`${[...new Set(contract.gatekeeperPrescriptions.violations)].length} correction${[...new Set(contract.gatekeeperPrescriptions.violations)].length !== 1 ? "s" : ""} auto-applied`} variant="amber" />
        )}
        {!hasGatekeeperViolations && (
          <Badge text="Clean run" variant="green" />
        )}
        <span className="wgp-toggle-chevron">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="wgp-body">
          <div className="wgp-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`wgp-tab ${activeTab === tab.id ? "wgp-tab--active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="wgp-tab-panel">
            {activeTab === "overview"   && <OverviewTab    contract={contract} />}
            {activeTab === "gatekeeper" && <GatekeeperTab  contract={contract} />}
            {activeTab === "guidelines" && <GuidelinesTab  contract={contract} />}
            {activeTab === "history"    && <HistoryTab     contract={contract} />}
          </div>
        </div>
      )}
    </div>
  );
}
