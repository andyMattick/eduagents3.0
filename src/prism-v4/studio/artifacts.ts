import type { InstructionalAnalysis, BlueprintModel } from "../session/InstructionalIntelligenceSession";

export type TeacherStudioTargetType = "student" | "class" | "unit" | "teacher";

export interface TeacherStudioTarget {
	targetType?: TeacherStudioTargetType;
	targetId?: string;
	teacherId?: string;
	unitId?: string;
}

export interface TeacherStudioSessionEnvelope {
	sessionId: string;
	documentIds: string[];
	activeBlueprintId?: string;
	activeTarget?: TeacherStudioTarget;
	outputIds: string[];
	createdAt: string;
	updatedAt: string;
	studioStateVersion: number;
}

export type BlueprintArtifactStatus = "active" | "archived";

export interface BlueprintArtifact {
	blueprintId: string;
	sessionId: string;
	analysisSessionId: string;
	teacherId?: string;
	unitId?: string;
	activeVersion: number;
	status: BlueprintArtifactStatus;
	createdAt: string;
	updatedAt: string;
}

export interface BlueprintVersionEditorContext {
	source: "seed" | "teacher-edit" | "regeneration";
	note?: string;
	changedFields?: string[];
}

export interface BlueprintVersionLineage {
	parentVersion?: number;
	createdFrom?: "analysis" | "assessment-output" | "teacher-edit";
}

export interface BlueprintVersionArtifact {
	blueprintId: string;
	version: number;
	blueprint: BlueprintModel;
	analysisSnapshot?: InstructionalAnalysis;
	editorContext?: BlueprintVersionEditorContext;
	lineage?: BlueprintVersionLineage;
	createdAt: string;
}

export type TeacherStudioOutputType =
	| "assessment"
	| "practice"
	| "explanations"
	| "lesson-plan"
	| "differentiation"
	| "simulation"
	| "class-insights";

export type TeacherStudioOutputStatus = "ready" | "failed" | "stale";

export interface TeacherStudioOutputArtifact<TPayload = unknown, TRenderModel = unknown> {
	outputId: string;
	sessionId: string;
	blueprintId: string;
	blueprintVersion: number;
	outputType: TeacherStudioOutputType;
	targetType?: TeacherStudioTargetType;
	targetId?: string;
	teacherId?: string;
	unitId?: string;
	options: Record<string, unknown>;
	payload: TPayload;
	renderModel: TRenderModel;
	status: TeacherStudioOutputStatus;
	createdAt: string;
	updatedAt: string;
}