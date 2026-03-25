import type { NarrowedTopic, Subject } from "./types";

export function narrowTopic(subject: Subject, topic: string): NarrowedTopic {
	const cleanTopic = String(topic ?? "the topic").trim() || "the topic";

	switch (subject) {
		case "ela":
			return {
				originalTopic: cleanTopic,
				narrowedTopic: `${cleanTopic} - a key scene or paragraph`,
				microTopic: `a 1-3 sentence excerpt that reveals an important idea in ${cleanTopic}`,
			};
		case "history":
		case "socialstudies":
		case "civics":
		case "government":
			return {
				originalTopic: cleanTopic,
				narrowedTopic: `${cleanTopic} - a specific event or document`,
				microTopic: `a primary-source snippet connected to ${cleanTopic}`,
			};
		case "science":
			return {
				originalTopic: cleanTopic,
				narrowedTopic: `${cleanTopic} - a measurable phenomenon`,
				microTopic: `a short observation or data-rich excerpt about ${cleanTopic}`,
			};
		case "math":
			return {
				originalTopic: cleanTopic,
				narrowedTopic: `${cleanTopic} - one target skill`,
				microTopic: `a focused worked-step or misconception in ${cleanTopic}`,
			};
		case "stem":
			return {
				originalTopic: cleanTopic,
				narrowedTopic: `${cleanTopic} - one subsystem or behavior`,
				microTopic: `a concise debugging/modeling context within ${cleanTopic}`,
			};
		default:
			return {
				originalTopic: cleanTopic,
				narrowedTopic: `${cleanTopic} - one concrete scenario`,
				microTopic: `a specific detail or excerpt from that scenario`,
			};
	}
}