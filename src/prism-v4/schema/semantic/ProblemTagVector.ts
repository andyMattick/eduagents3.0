	export interface CognitiveProfile {
	  bloom: {
	    remember: number;
	    understand: number;
	    apply: number;
	    analyze: number;
	    evaluate: number;
	    create: number;
	  };
	  difficulty: number;
	  linguisticLoad: number;
	  abstractionLevel: number;
	  multiStep: number;
	  representationComplexity: number;
	  misconceptionRisk: number;
	}

	export interface ReasoningMetadata {
	  azureBloom: CognitiveProfile["bloom"];
	  structuralBloom: Partial<CognitiveProfile["bloom"]>;
	  templateIds: string[];
	  teacherTemplateIds: string[];
	  overridesApplied: boolean;
	  structuralMultiStep?: number;
	  selectedTemplateId?: string;
	  selectedTemplateName?: string;
	  selectedTemplateSource?: "system" | "teacher";
	  selectedTemplateStatus?: "stable" | "learning" | "frozen";
	  selectedTemplateFrozen?: boolean;
	  templateConfidence?: number;
	  adjustedTemplateConfidence?: number;
	  expectedSteps?: number;
	  adjustedExpectedSteps?: number;
	}

	export interface TeacherAdjustmentMetadata {
	  overrideVersion: number;
	  lastUpdatedAt: string;
	}

	export interface ProblemTagVector {
	  subject: string; // "math", "reading", etc.
	  domain: string;  // "fractions", "inference", etc.
	
	  concepts: Record<string, number>;
	
	  problemType: {
	    trueFalse?: number;
	    multipleChoice?: number;
	    multipleSelect?: number;
	    shortAnswer?: number;
	    constructedResponse?: number;
	    fillInBlank?: number;
	    matching?: number;
	    dragAndDrop?: number;
	    graphing?: number;
	    equationEntry?: number;
	    sorting?: number;
	    hotSpot?: number;
	    simulationTask?: number;
	    primarySourceAnalysis?: number;
	    labDesign?: number;
	  };
	
	  multiStep: number;
	  steps: number;
	  representation:
	    | "equation"
	    | "table"
	    | "graph"
	    | "paragraph"
	    | "diagram"
	    | "map"
	    | "timeline"
	    | "experiment"
	    | "primarySource";
	  representationCount: number;
	
	  linguisticLoad: number;      // 0–1
	  vocabularyTier: number;      // 1–3
	  sentenceComplexity: number;  // 0–1
	  wordProblem: number;         // 0–1
	  passiveVoice: number;        // 0–1
	  abstractLanguage: number;    // 0–1
	
	  bloom: {
	    remember: number;
	    understand: number;
	    apply: number;
	    analyze: number;
	    evaluate: number;
	    create: number;
	  };
	
	  difficulty: number;          // 0–1
	  distractorDensity: number;   // 0–1
	  abstractionLevel: number;    // 0–1
	  computationComplexity?: number; // math-specific
	
	  misconceptionTriggers: Record<string, number>;
	
	  frustrationRisk: number;     // 0–1
	  engagementPotential: number; // 0–1
	
	  // Standards alignment
	  standards?: Record<string, number>;

	  teacherSegmentation?: Record<string, unknown>;
	  teacherProblemGrouping?: Record<string, unknown>;
	  teacherAdjustments?: TeacherAdjustmentMetadata;
	  reasoning?: ReasoningMetadata;

	  // NOTE: `cognitive` is part of the stable v4 contract.
	  // PRISM and downstream analytics depend on this shape.
	  cognitive: CognitiveProfile;
	
	  azure?: {
	    text: string;
	    layout: any;
	    paragraphs: any[];
	    tables: any[];
	    keyPhrases?: string[];
	    entities?: any[];
	    readingOrder?: any;
	  };
	}
