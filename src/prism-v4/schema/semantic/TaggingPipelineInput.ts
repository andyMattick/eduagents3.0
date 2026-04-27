	import { AzureExtractResult } from "./AzureExtractResult";

    export interface TaggingPipelineInput {
	  documentId: string;
	  fileName: string;
	  azureExtract: AzureExtractResult;
	}
