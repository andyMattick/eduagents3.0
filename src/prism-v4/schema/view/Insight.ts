	export interface Insight {
      id: string;
	  scope: "student" | "class" | "assignment" | "unit" | "problem";
	  targetId: string; // e.g., studentId, classId, assignmentId, etc.
	
	  type:
	    | "strength"
	    | "risk"
	    | "misalignment"
	    | "misconceptionCluster"
	    | "readiness"
	    | "growth"
	    | "fairness";
	
	  title: string;
	  summary: string;
	  details?: string;
	
	  tags?: string[]; // concept tags, standards, etc.
	  severity?: "low" | "medium" | "high";
	}
