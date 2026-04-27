	export interface ProblemScore {
	  studentId: string;
	  problemId: string;
	  assignmentId?: string;
	  assessmentId?: string;
	  problemGroupId?: string;
	  unitId?: string;
	
	  score: number;
	  maxScore: number;
	
	  orderIndex?: number;
	  timestamp?: string;
	
	  standards?: Record<string, number>;
	
	  bloomLevel?: string;
	  affectiveSignal?: "frustrated" | "confident" | "neutral";

	  misconceptions?: string[];
	}
