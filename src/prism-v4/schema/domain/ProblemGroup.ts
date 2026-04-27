	export interface ProblemGroup {
	  problemGroupId: string;
	  title?: string;
	  groupType: string; // "fluency", "application", "reasoning", "passage", etc.
	  sourceSpan?: {
		firstPage: number;
		lastPage: number;
	  };
	
	  problemIds: string[];
	}
