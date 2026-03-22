	export interface AzureExtractResult {
	  fileName: string;
	  content: string;
	  pages: {
	    pageNumber: number;
	    text: string;
	  }[];
	  paragraphs?: { text: string; pageNumber: number; role?: string }[];
	  tables?: {
	    rowCount: number;
	    columnCount: number;
	    pageNumber?: number;
	    cells: {
	      rowIndex: number;
	      columnIndex: number;
	      text: string;
	    }[];
	  }[];
	  readingOrder?: string[];
	}
