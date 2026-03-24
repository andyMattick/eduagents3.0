import type { RepresentationName } from "./heuristics";

export interface RepresentationCueFlags {
	equation: boolean;
	graph: boolean;
	table: boolean;
	diagram: boolean;
	map: boolean;
	timeline: boolean;
	experiment: boolean;
	primarySource: boolean;
	codeLike: boolean;
}

export interface RepresentationSignals {
	representation: RepresentationName;
	representationCount: number;
	cues: RepresentationCueFlags;
}

interface DetectRepresentationSignalsArgs {
	text: string;
	hasExtractedTable?: boolean;
}

function hasAnyMatch(text: string, patterns: RegExp[]) {
	return patterns.some((pattern) => pattern.test(text));
}

export function detectRepresentationSignals(args: DetectRepresentationSignalsArgs): RepresentationSignals {
	const normalizedText = args.text.toLowerCase();
	const cues: RepresentationCueFlags = {
		equation: hasAnyMatch(normalizedText, [
			/\bsolve for\b/,
			/\bequation\b/,
			/\bf\(x\)\b/,
			/\by\s*=\s*/,
			/\b[0-9a-z]+\s*=\s*[0-9a-z+\-*/() ]+/,
		]),
		graph: hasAnyMatch(normalizedText, [
			/\bgraph\b/,
			/\bchart\b/,
			/\bplot\b/,
			/\baxis\b/,
			/\bhistogram\b/,
			/\bscatterplot\b/,
		]),
		table: args.hasExtractedTable === true || hasAnyMatch(normalizedText, [
			/\btable\b/,
			/\brow\b/,
			/\bcolumn\b/,
		]),
		diagram: hasAnyMatch(normalizedText, [
			/\bdiagram\b/,
			/\billustration\b/,
			/\blabeled figure\b/,
			/\bschematic\b/,
		]),
		map: hasAnyMatch(normalizedText, [
			/\bmap\b/,
			/\bregion\b/,
			/\blocation\b/,
		]),
		timeline: hasAnyMatch(normalizedText, [
			/\btimeline\b/,
			/\bsequence of events\b/,
		]),
		experiment: hasAnyMatch(normalizedText, [
			/\bexperiment\b/,
			/\blab\b/,
			/\bvariable\b/,
			/\bhypothesis\b/,
			/\bprocedure\b/,
		]),
		primarySource: hasAnyMatch(normalizedText, [
			/\bpassage\b/,
			/\bexcerpt\b/,
			/\bsource\b/,
			/\bdocument\b/,
			/\bauthor\b/,
			/\bread the passage\b/,
		]),
		codeLike: hasAnyMatch(normalizedText, [
			/[{}]/,
			/;/,
			/\bfor\s*\(/,
			/\bwhile\s*\(/,
			/\bif\s*\(/,
			/\bfunction\b/,
			/\bdef\b/,
			/\bclass\b/,
			/\bconsole\b/,
		]),
	};

	const precedence: Array<{ name: RepresentationName; active: boolean }> = [
		{ name: "table", active: cues.table },
		{ name: "graph", active: cues.graph },
		{ name: "map", active: cues.map },
		{ name: "timeline", active: cues.timeline },
		{ name: "experiment", active: cues.experiment },
		{ name: "primarySource", active: cues.primarySource },
		{ name: "diagram", active: cues.diagram },
		{ name: "equation", active: cues.equation },
	];

	const representation = precedence.find((entry) => entry.active)?.name ?? "paragraph";
	const publicCueCount = Object.entries(cues)
		.filter(([name, active]) => name !== "codeLike" && active)
		.length;
	const representationCount = Math.max(1, publicCueCount + (cues.codeLike ? 1 : 0));

	return {
		representation,
		representationCount,
		cues,
	};
}