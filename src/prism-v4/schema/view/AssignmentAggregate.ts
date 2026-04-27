	export interface AssignmentAggregate {
	  assignmentId: string;
	
	  averageScore: number;
	  medianScore?: number;
	  scoreDistribution?: number[]; // histogram bins
	
	  standardsMastery?: Record<string, number>;
	  conceptMastery?: Record<string, number>;
	
	  difficultyProfile?: {
	    averageDifficulty: number;
	    perceivedDifficulty?: number;
	  };
	
	  misconceptionCounts?: Record<string, number>;
	}
