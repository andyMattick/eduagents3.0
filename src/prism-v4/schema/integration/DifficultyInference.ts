	export interface DifficultyInference {
	  problemId: string;
	
	  actualDifficulty?: number;   // from student performance
	  classDifficulty?: number;    // aggregated
	  predictedDifficulty?: number; // from PRISM
	}
