//
// ─────────────────────────────────────────────────────────────
//   Minimal Teacher Intent (UI → Pipeline)
// ─────────────────────────────────────────────────────────────
//

export * from "./MinimalTeacherIntent";
export * from "./UnifiedAssessmentRequest";
export * from "./assessmentTypes";
export * from "./Blueprint";
export * from "./UnifiedAssessmentResponse";
export * from "./WriterContract";
export * from "./deriveTemplate";
export * from "./DocumentInsights";

// Shared, intentionally-flexible payload shapes used by derive-template mode.
export type TeacherPreferences = Record<string, unknown>;
export type StudentProfile = Record<string, unknown>;


