import { DeriveTemplateRequest } from "@/pipeline/contracts/UnifiedAssessmentRequest";
import { DerivedTemplate } from "@/pipeline/contracts/deriveTemplate";
import { TemplateAnalysis } from "@/pipeline/agents/templateDeriver/types";

export interface TemplatesListing {
	system: Array<Record<string, unknown>>;
	teacher: DerivedTemplate[];
}

export async function deriveTemplate(request: DeriveTemplateRequest): Promise<{ template: DerivedTemplate; analysis?: TemplateAnalysis }> {
	const response = await fetch("/api/derive-template", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(request),
	});

	if (!response.ok) {
		const payload = await response.json().catch(() => ({}));
		throw new Error(payload?.message ?? payload?.error ?? "deriveTemplate request failed");
	}

	return response.json();
}

export async function saveTemplate(teacherId: string, template: DerivedTemplate): Promise<void> {
	const response = await fetch("/api/save-template", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ teacherId, template }),
	});

	if (!response.ok) {
		const payload = await response.json().catch(() => ({}));
		throw new Error(payload?.message ?? payload?.error ?? "saveTemplate request failed");
	}
}

export async function listTemplates(teacherId: string): Promise<TemplatesListing> {
	const response = await fetch(`/api/templates?teacherId=${encodeURIComponent(teacherId)}`);

	if (!response.ok) {
		const payload = await response.json().catch(() => ({}));
		throw new Error(payload?.message ?? payload?.error ?? "listTemplates request failed");
	}

	return response.json();
}
