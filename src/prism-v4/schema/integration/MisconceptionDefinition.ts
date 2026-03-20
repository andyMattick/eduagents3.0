	export interface MisconceptionDefinition {
	  id: string;
	  label: string;
	  description?: string;
	
	  triggers: string[]; // tag names, patterns, etc.
	  cluster?: string;   // e.g., "fractionMagnitude", "areaVsPerimeter"
	}
