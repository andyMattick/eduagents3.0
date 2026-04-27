	export interface Recommendation {
	  id: string;
	  scope: "student" | "group" | "class";
	  targetId: string;
	
	  type:
	    | "reteach"
	    | "preteach"
	    | "enrich"
	    | "scaffold"
	    | "resequence"
	    | "adjustDifficulty";
	
	  title: string;
	  description: string;
	
	  relatedStandards?: string[];
	  relatedConcepts?: string[];
	}
