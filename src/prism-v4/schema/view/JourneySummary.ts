	export interface JourneySummary {
	  studentId: string;
	  classId: string;
	
	  predictedAccuracy: number;
	  predictedAverageDistance: number;
	
	  riskTags: string[];
	  strengthTags: string[];
	
	  keyMoments?: {
	    stepIndex: number;
	    problemId: string;
	    description: string;
	  }[];
	}
