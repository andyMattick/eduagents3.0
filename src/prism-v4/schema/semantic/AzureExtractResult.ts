	export interface AzureExtractResult {
	  fileName: string;
	  content: string;
	  pages: {
	    pageNumber: number;
	    text: string;
	  }[];
	  paragraphs?: { text: string; pageNumber: number }[];
	  tables?: any[];
	}
