	export interface ProblemGroup {
	  problemGroupId: string;
	  title?: string;
	  groupType: string; // "fluency", "application", "reasoning", "passage", etc.
	
	  problemIds: string[];
	}
