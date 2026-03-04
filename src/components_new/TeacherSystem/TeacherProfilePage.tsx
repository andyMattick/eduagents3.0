/**
 * TeacherProfilePage.tsx
 *
 * Editable profile form that persists a teacher's default preferences.
 * These defaults are injected into every pipeline run as a constraint layer,
 * reducing the number of questions the system needs to ask.
 *
 * Sections
 * ─────────
 * 1. Assessment defaults   (types, question types)
 * 2. Pacing defaults       (duration per assessment type, seconds per question type)
 * 3. Style preferences     (tone, language level, instruction length, context)
 * 4. DIL preferences       (auto-summarize, vocabulary, confirm)
 */

import React, { useCallback } from "react";
import "./TeacherProfilePage.css";
import { useTeacherProfile } from "@/hooks/useTeacherProfile";
import type {
  QuestionType,
  StylePreferences,
  DILPreferences,
} from "@/types/teacherProfile";

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_ASSESSMENT_TYPES = [
  { value: "bellRinger",  label: "Bell Ringer" },
  { value: "exitTicket",  label: "Exit Ticket" },
  { value: "quiz",        label: "Quiz" },
  { value: "test",        label: "Test" },
  { value: "worksheet",   label: "Worksheet" },
  { value: "testReview",  label: "Test Review" },
];

const ALL_QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "multipleChoice",      label: "Multiple Choice" },
  { value: "shortAnswer",         label: "Short Answer" },
  { value: "freeResponse",        label: "Free Response" },
  { value: "constructedResponse", label: "Constructed Response" },
  { value: "trueFalse",           label: "True / False" },
  { value: "fillInTheBlank",      label: "Fill in the Blank" },
  { value: "matching",            label: "Matching" },
  { value: "ordering",            label: "Ordering" },
  { value: "passageBased",        label: "Passage-Based (MCQ)" },
  { value: "graphInterpretation", label: "Graph Interpretation" },
  { value: "arithmeticFluency",   label: "Arithmetic Fluency" },
];

const TONE_OPTIONS: { value: StylePreferences["tone"]; label: string }[] = [
  { value: "formal",          label: "Formal — academic, no contractions" },
  { value: "conversational",  label: "Conversational — accessible, friendly" },
];

const LANGUAGE_OPTIONS: { value: StylePreferences["languageLevel"]; label: string }[] = [
  { value: "academic",        label: "Academic — subject-specific vocabulary" },
  { value: "studentFriendly", label: "Student-Friendly — plain language" },
];

const LENGTH_OPTIONS: { value: StylePreferences["instructionLength"]; label: string }[] = [
  { value: "short",    label: "Short — concise stems (≤30 words)" },
  { value: "detailed", label: "Detailed — full-context, longer stems" },
];

const CONTEXT_OPTIONS: { value: StylePreferences["contextPreference"]; label: string }[] = [
  { value: "realWorld", label: "Real-World — practical scenarios" },
  { value: "abstract",  label: "Abstract — theoretical framing" },
  { value: "mixed",     label: "Mixed — variety of both" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export interface TeacherProfilePageProps {
  userId: string;
}

export const TeacherProfilePage: React.FC<TeacherProfilePageProps> = ({ userId }) => {
  const { profile, loading, saveStatus, errorMessage, save, patch } =
    useTeacherProfile(userId);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (profile) save(profile);
    },
    [profile, save]
  );

  const toggleAssessmentType = useCallback(
    (type: string) => {
      if (!profile) return;
      const current = profile.assessmentDefaults.assessmentTypes;
      const next = current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type];
      patch("assessmentDefaults", { ...profile.assessmentDefaults, assessmentTypes: next });
    },
    [profile, patch]
  );

  const toggleQuestionType = useCallback(
    (type: QuestionType) => {
      if (!profile) return;
      const current = profile.questionDefaults.questionTypes;
      const next = current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type];
      patch("questionDefaults", { ...profile.questionDefaults, questionTypes: next });
    },
    [profile, patch]
  );

  const setAssessmentDuration = useCallback(
    (type: string, minutes: number) => {
      if (!profile) return;
      patch("pacingDefaults", {
        ...profile.pacingDefaults,
        assessmentDurationMinutes: {
          ...profile.pacingDefaults.assessmentDurationMinutes,
          [type]: Math.max(1, minutes),
        },
      });
    },
    [profile, patch]
  );

  const setQuestionTypeSeconds = useCallback(
    (type: string, seconds: number) => {
      if (!profile) return;
      patch("pacingDefaults", {
        ...profile.pacingDefaults,
        questionTypeSeconds: {
          ...profile.pacingDefaults.questionTypeSeconds,
          [type]: Math.max(1, seconds),
        },
      });
    },
    [profile, patch]
  );

  const setStyle = useCallback(
    <K extends keyof StylePreferences>(key: K, value: StylePreferences[K]) => {
      if (!profile) return;
      patch("stylePreferences", { ...profile.stylePreferences, [key]: value });
    },
    [profile, patch]
  );

  const setDIL = useCallback(
    <K extends keyof DILPreferences>(key: K, value: DILPreferences[K]) => {
      if (!profile) return;
      patch("dilPreferences", { ...profile.dilPreferences, [key]: value });
    },
    [profile, patch]
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="teacher-profile-page"><p>Loading your profile…</p></div>;
  }

  if (!profile) {
    return (
      <div className="teacher-profile-page">
        <p style={{ color: "#dc2626" }}>Could not load profile. {errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="teacher-profile-page">
      <h1>My Teaching Profile</h1>
      <p className="page-subtitle">
        These defaults are pre-filled in every new assessment so you spend less time answering the same questions.
        You can always override them for a single run.
      </p>

      <form onSubmit={handleSubmit} noValidate>

        {/* ── 1. Assessment defaults ───────────────────────────────────── */}
        <div className="profile-section">
          <h2><span className="section-icon">📋</span> Assessment Defaults</h2>

          <div className="profile-field">
            <label>Default assessment types (used when you don't specify)</label>
            <div className="chip-group">
              {ALL_ASSESSMENT_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`chip ${profile.assessmentDefaults.assessmentTypes.includes(value) ? "active" : ""}`}
                  onClick={() => toggleAssessmentType(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="profile-field">
            <label>Default question types (used when you don't specify)</label>
            <div className="chip-group">
              {ALL_QUESTION_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`chip ${profile.questionDefaults.questionTypes.includes(value) ? "active" : ""}`}
                  onClick={() => toggleQuestionType(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── 2. Pacing defaults ───────────────────────────────────────── */}
        <div className="profile-section">
          <h2><span className="section-icon">⏱</span> Pacing Defaults</h2>

          <div className="profile-field">
            <label>Expected duration per assessment type (minutes)</label>
            <div className="pacing-grid">
              {ALL_ASSESSMENT_TYPES.map(({ value, label }) => (
                <React.Fragment key={value}>
                  <span className="pacing-label">{label}</span>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={profile.pacingDefaults.assessmentDurationMinutes[value] ?? ""}
                    onChange={(e) => setAssessmentDuration(value, parseInt(e.target.value, 10) || 1)}
                  />
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="profile-field" style={{ marginTop: "1rem" }}>
            <label>Expected time per question type (seconds)</label>
            <div className="pacing-grid">
              {ALL_QUESTION_TYPES.map(({ value, label }) => (
                <React.Fragment key={value}>
                  <span className="pacing-label">{label}</span>
                  <input
                    type="number"
                    min={5}
                    max={1200}
                    value={profile.pacingDefaults.questionTypeSeconds[value] ?? ""}
                    onChange={(e) =>
                      setQuestionTypeSeconds(value, parseInt(e.target.value, 10) || 30)
                    }
                  />
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* ── 3. Style preferences ─────────────────────────────────────── */}
        <div className="profile-section">
          <h2><span className="section-icon">✍️</span> Writing Style</h2>

          <div className="profile-field">
            <label>Tone</label>
            <select
              value={profile.stylePreferences.tone}
              onChange={(e) => setStyle("tone", e.target.value as StylePreferences["tone"])}
            >
              {TONE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="profile-field">
            <label>Language level</label>
            <select
              value={profile.stylePreferences.languageLevel}
              onChange={(e) => setStyle("languageLevel", e.target.value as StylePreferences["languageLevel"])}
            >
              {LANGUAGE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="profile-field">
            <label>Instruction length</label>
            <select
              value={profile.stylePreferences.instructionLength}
              onChange={(e) => setStyle("instructionLength", e.target.value as StylePreferences["instructionLength"])}
            >
              {LENGTH_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="profile-field">
            <label>Question context preference</label>
            <select
              value={profile.stylePreferences.contextPreference}
              onChange={(e) =>
                setStyle("contextPreference", e.target.value as StylePreferences["contextPreference"])
              }
            >
              {CONTEXT_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── 4. DIL preferences ───────────────────────────────────────── */}
        <div className="profile-section">
          <h2><span className="section-icon">📄</span> Document Preferences</h2>

          {(
            [
              { key: "autoSummarize",             label: "Automatically summarise uploaded documents" },
              { key: "requireSummaryConfirmation", label: "Ask me to confirm the summary before generating" },
              { key: "autoExtractVocabulary",      label: "Automatically extract vocabulary from documents" },
              { key: "autoExtractAngles",          label: "Automatically extract question angles from documents" },
            ] as const
          ).map(({ key, label }) => (
            <div className="toggle-row" key={key}>
              <span>{label}</span>
              <input
                type="checkbox"
                checked={profile.dilPreferences[key]}
                onChange={(e) => setDIL(key, e.target.checked)}
              />
            </div>
          ))}
        </div>

        {/* ── Save bar ──────────────────────────────────────────────────── */}
        <div className="profile-save-bar">
          <button
            type="submit"
            className="btn-save-profile"
            disabled={saveStatus === "saving"}
          >
            {saveStatus === "saving" ? "Saving…" : "Save Profile"}
          </button>
          {saveStatus === "saved" && (
            <span className="save-status saved">✓ Profile saved</span>
          )}
          {saveStatus === "error" && (
            <span className="save-status error">⚠ {errorMessage ?? "Save failed"}</span>
          )}
        </div>

      </form>
    </div>
  );
};

export default TeacherProfilePage;
