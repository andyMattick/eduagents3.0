	export interface StudentPersona {
	  id: string;
	  name?: string;
	  gradeLevel: number; // K=0, 1–12
	
	  subjects: Record<string, {
	    tagMastery: Record<string, number>;
	    misconceptionRisk: Record<string, number>;
	    exposureCount: Record<string, number>;
	    recency: Record<string, number>;
	
	    // Standards per subject
	    standardsMastery?: Record<string, number>;
	    standardsExposure?: Record<string, number>;
	    standardsRecency?: Record<string, number>;
	  }>;
	
	  cognitiveProfile: {
	    remember: number;
	    understand: number;
	    apply: number;
	    analyze: number;
	    evaluate: number;
	    create: number;
	  };
	
	  linguisticProfile: {
	    vocabularyTier1: number;
	    vocabularyTier2: number;
	    vocabularyTier3: number;
	    sentenceComplexityTolerance: number;
	    wordProblemTolerance: number;
	    readingFluency: number;
	  };
	
	  difficultyProfile: {
	    low: number;
	    medium: number;
	    high: number;
	    multiStepTolerance: number;
	    distractorTolerance: number;
	  };
	
	  behavior: {
	    persistence: number;
	    confidence: number;
	    guessingBehavior: "low" | "medium" | "high";
	    timeSensitivity: "slow" | "average" | "fast";
	    rereadBehavior: "never" | "sometimes" | "often";
	  };
	
	  affective: {
	    frustrationTolerance: number;
	    anxietySensitivity: number;
	    engagement: number;
	  };
	
	  history: {
	    problemId: string;
	    subject: string;
	    tags: Record<string, number>;
	    correct: boolean;
	    timeSpent: number;
	    timestamp: number;
	  }[];
	
	  personaType?: "ELL" | "IEP" | "strugglingReader" | "gifted" | "typical";
	}
