	export interface Unit {
	  unitId: string;
	  title: string;
	  subject: string;
	  gradeLevel: number;
	
	  standards?: Record<string, number>;
	  concepts?: Record<string, number>;
	
	  assignmentIds: string[];
	
	  startDate?: string;
	  endDate?: string;
	}
