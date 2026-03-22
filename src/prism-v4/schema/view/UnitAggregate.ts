	export interface UnitAggregate {
	  unitId: string;
	
	  averageScore: number;
	  standardsMastery?: Record<string, number>;
	  conceptMastery?: Record<string, number>;
	
	  misconceptionCounts?: Record<string, number>;
	  growthEstimate?: number; // change over time within unit
	}
