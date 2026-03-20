import { StudentPersona } from "./StudentPersona";

export interface ClassProfile {
	  classId: string;
	  name?: string;
	  gradeLevel: number;
	
	  students?: StudentPersona[];
	
	  aggregate?: {
	    averageTagMastery: Record<string, Record<string, number>>;
	    averageMisconceptionRisk: Record<string, Record<string, number>>;
	    masteryVariance: Record<string, Record<string, number>>;
	
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
	
	    // Standards aggregates
	    averageStandardsMastery?: Record<string, number>;
	    standardsVariance?: Record<string, number>;
	
	    history?: {
	      problemId: string;
	      subject: string;
	      averageDistance: number;
	      timestamp: number;
	    }[];
	  };
	
	  genericProfile?: {
	    gradeBand: string; // "K-2", "3-5", etc.
	    subject: string;
	
	    averageTagMastery: Record<string, Record<string, number>>;
	    averageMisconceptionRisk: Record<string, Record<string, number>>;
	
	    distribution: {
	      struggling: number;
	      typical: number;
	      advanced: number;
	    };
	
	    averageStandardsMastery?: Record<string, number>;
	
	    personas?: StudentPersona[];
	  };
	}
