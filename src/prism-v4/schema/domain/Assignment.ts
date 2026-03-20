	export interface Assignment {
	  assignmentId: string;
	  unitId?: string;
	
	  title: string;
	  type: "quiz" | "test" | "project" | "practice" | "homework" | "exitTicket";
	
	  standards?: Record<string, number>;
	
	  problemIds: string[];
	
	  dateAssigned?: string;
	  dateDue?: string;
	}
