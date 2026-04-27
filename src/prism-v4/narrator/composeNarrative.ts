import type { NarratorBlocks } from "./types";

export function composeNarrative(blocks: NarratorBlocks): string {
	const lines: string[] = [];

	if (blocks.taskEssence) {
		lines.push(`This problem asks students to ${blocks.taskEssence.summary}.`);
	}

	if (blocks.cognitiveMoves?.length) {
		const move = blocks.cognitiveMoves[0];
		lines.push(`To do this well, students typically ${move.step}, which helps them ${move.whyItMatters}.`);
	}

	if (blocks.likelyMisconceptions?.length) {
		const misconception = blocks.likelyMisconceptions[0];
		lines.push(`Students often struggle with ${misconception.misconception}, especially when ${misconception.trigger}.`);
	}

	if (blocks.instructionalLevers?.length) {
		const lever = blocks.instructionalLevers[0];
		lines.push(`A helpful move is to ${lever.move}, because it ${lever.whyItWorks}.`);
	}

	if (blocks.instructionalPurpose) {
		lines.push(`This task builds toward ${blocks.instructionalPurpose.futureConnection}, making it an important stepping stone in the unit.`);
	}

	if (blocks.representationalDemands && lines.length === 0) {
		lines.push(`Students have to work with ${blocks.representationalDemands.forms.join(", ")}, and ${blocks.representationalDemands.explanation}.`);
	}

	return lines.join(" ");
}
