export enum NarrativeTheme {
	WhatProblemAsks = "what_problem_asks",
	ReasoningPath = "reasoning_path",
	StudentStruggles = "student_struggles",
	Complexity = "complexity",
	SkillsTouched = "skills_touched",
	Connections = "connections",
	Scaffolding = "scaffolding",
	Enrichment = "enrichment",
	Standards = "standards",
	WhyThisInterpretation = "why_this_interpretation",
}

export const NARRATIVE_THEME_OPTIONS: Array<{ value: NarrativeTheme; label: string }> = [
	{ value: NarrativeTheme.WhatProblemAsks, label: "What this problem is really asking" },
	{ value: NarrativeTheme.ReasoningPath, label: "The reasoning path students must take" },
	{ value: NarrativeTheme.StudentStruggles, label: "Where students may struggle" },
	{ value: NarrativeTheme.Complexity, label: "How complex this problem is" },
	{ value: NarrativeTheme.SkillsTouched, label: "What skills this problem touches" },
	{ value: NarrativeTheme.Connections, label: "How this connects to other problems" },
	{ value: NarrativeTheme.Scaffolding, label: "How to scaffold this for different learners" },
	{ value: NarrativeTheme.Enrichment, label: "How to enrich or extend this problem" },
	{ value: NarrativeTheme.Standards, label: "What standards this aligns to" },
	{ value: NarrativeTheme.WhyThisInterpretation, label: "Why the system interpreted it this way" },
];

export function narrativeThemeLabel(theme: NarrativeTheme) {
	return NARRATIVE_THEME_OPTIONS.find((option) => option.value === theme)?.label ?? "Narrative";
}