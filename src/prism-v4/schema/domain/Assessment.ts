	export interface Assessment {
	  assessmentId: string;
	  assignmentId: string;
	
	  problemGroupIds: string[];
	
	  standards?: Record<string, number>;
	
	  type: "quiz" | "test" | "benchmark" | "midterm" | "final"
	  dateAdministered?: string;
	}
