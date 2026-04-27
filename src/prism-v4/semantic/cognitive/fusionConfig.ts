export interface FusionWeights {
	bloom: {
		azure: number;
		structural: number;
		template: number;
	};
	difficulty: {
		azure: number;
		structural: number;
		template: number;
	};
	multistep: {
		extracted: number;
		structural: number;
		template: number;
	};
}

export const fusionConfig: FusionWeights = {
	bloom: {
		azure: 0.3,
		structural: 0.25,
		template: 0.45,
	},
	difficulty: {
		azure: 0.5,
		structural: 0.2,
		template: 0.3,
	},
	multistep: {
		extracted: 0.4,
		structural: 0.3,
		template: 0.3,
	},
};