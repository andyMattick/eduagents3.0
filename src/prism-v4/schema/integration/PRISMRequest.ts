import { ClassInput } from "./ClassInput";

export interface PRISMRequest {
	  mode: "singleStudent" | "class" | "personas";
	
	  classInput: ClassInput;
	
	  // Optional: which views/outputs to compute
	  options?: {
	    computeJourneys?: boolean;
	    computeAggregates?: boolean;
	    computeInsights?: boolean;
	  };
	}
