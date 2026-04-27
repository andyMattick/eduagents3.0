	export interface ClassAggregate {
	  classId: string;
	
	  overallAverageScore: number;
	  standardsMastery?: Record<string, number>;
	  conceptMastery?: Record<string, number>;
	
	  misconceptionCounts?: Record<string, number>;
	
	  difficultyByAssessmentType?: Record<string, {
	    averageScore: number;
    averageDifficulty: number;
	  }>;
	}
