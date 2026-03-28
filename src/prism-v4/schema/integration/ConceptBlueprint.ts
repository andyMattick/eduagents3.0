export type ConceptBlueprintBloomLevel =
	| "remember"
	| "understand"
	| "apply"
	| "analyze"
	| "evaluate"
	| "create";

export type ConceptBlueprintScenarioType =
	| "real-world"
	| "simulation"
	| "data-table"
	| "graphical"
	| "abstract-symbolic";

export type ConceptBlueprintScenarioDirective = "keep-context-change-numbers";

export type ConceptBlueprintItemMode =
	| "identify"
	| "state"
	| "interpret"
	| "compare"
	| "apply"
	| "analyze"
	| "evaluate"
	| "explain"
	| "construct";

export interface ConceptBlueprintConceptInput {
	conceptId?: string;
	displayName: string;
	absoluteItemHint?: number;
	maxBloomLevel?: ConceptBlueprintBloomLevel;
	scenarioPatterns?: ConceptBlueprintScenarioType[];
	scenarioDirective?: ConceptBlueprintScenarioDirective;
	itemModes?: ConceptBlueprintItemMode[];
}

export interface ConceptBlueprintMergeInput {
	conceptIds: string[];
	mergedConceptId: string;
	displayName?: string;
}

export interface ConceptBlueprintEdits {
	removeConceptIds?: string[];
	addConcepts?: ConceptBlueprintConceptInput[];
	mergeConcepts?: ConceptBlueprintMergeInput[];
	itemCountOverrides?: Record<string, number>;
	bloomDistributions?: Record<string, Partial<Record<ConceptBlueprintBloomLevel, number>>>;
	bloomCeilings?: Record<string, ConceptBlueprintBloomLevel>;
	bloomLevelAppends?: Record<string, ConceptBlueprintBloomLevel[]>;
	scenarioOverrides?: Record<string, ConceptBlueprintScenarioType[]>;
	scenarioDirectives?: Record<string, ConceptBlueprintScenarioDirective>;
	sectionOrder?: string[];
	now?: string;
}

export interface ConceptBlueprint {
	assessmentId?: string;
	teacherId?: string;
	unitId?: string;
	edits: ConceptBlueprintEdits;
}

export interface IntentRequestOptions extends Record<string, unknown> {
	conceptBlueprint?: ConceptBlueprint;
}

export interface BuildTestIntentOptions extends IntentRequestOptions {
	itemCount?: number;
	teacherId?: string;
	unitId?: string;
	assessmentId?: string;
	conceptBlueprint?: ConceptBlueprint;
}

export interface ConceptVerificationPreviewRequest {
	sessionId: string;
	documentIds: string[];
	options?: BuildTestIntentOptions;
}