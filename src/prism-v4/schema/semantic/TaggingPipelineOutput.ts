import { DocumentSemanticInsights } from "./DocumentSemanticInsights";
import { Problem } from "../domain";
import { ProblemTagVector } from "./ProblemTagVector";

export interface TaggingPipelineOutput {
	  documentId: string;
	
	  // Canonical document meaning
	  documentInsights: DocumentSemanticInsights;
	
	  // Problems with semantic fingerprints
	  problems: Problem[];
	
	  // Problem tag vectors (for convenience)
	  problemVectors: ProblemTagVector[];
	}
