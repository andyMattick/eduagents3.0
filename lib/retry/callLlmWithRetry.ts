import { callLLM, callLLMWithUsage } from "../llm";
import type { LlmCallResult } from "../provider";

function parseStatusCode(message: string): number | null {
	const match = message.match(/\((\d{3})\)/);
	if (!match) return null;
	return Number(match[1]);
}

function isRetryableStatus(status: number | null): boolean {
	if (status === null) return false;
	if (status === 429) return true;
	return status >= 500 && status <= 599;
}

function backoffMs(attempt: number): number {
	const base = 300;
	const jitter = Math.floor(Math.random() * 150);
	return base * Math.pow(2, attempt) + jitter;
}

async function delay(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callLlmWithRetry(params: {
	prompt: string;
	metadata?: Record<string, unknown>;
	options?: {
		model?: string;
		temperature?: number;
		maxOutputTokens?: number;
	};
	maxRetries?: number;
}): Promise<string> {
	const { maxRetries = 1, ...rest } = params;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await callLLM(rest);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			const status = parseStatusCode(message);
			if (attempt >= maxRetries || !isRetryableStatus(status)) {
				throw err;
			}
			await delay(backoffMs(attempt));
		}
	}

	throw new Error("LLM retry wrapper exhausted without returning output");
}

export async function callLlmWithRetryWithUsage(params: {
	prompt: string;
	metadata?: Record<string, unknown>;
	options?: {
		model?: string;
		temperature?: number;
		maxOutputTokens?: number;
	};
	maxRetries?: number;
}): Promise<LlmCallResult> {
	const { maxRetries = 1, ...rest } = params;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await callLLMWithUsage(rest);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			const status = parseStatusCode(message);
			if (attempt >= maxRetries || !isRetryableStatus(status)) {
				throw err;
			}
			await delay(backoffMs(attempt));
		}
	}

	throw new Error("LLM retry wrapper exhausted without returning output");
}