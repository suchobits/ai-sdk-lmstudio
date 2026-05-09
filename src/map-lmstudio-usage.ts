import type { LanguageModelV3Usage } from '@ai-sdk/provider';

export function mapLmstudioUsage(
	usage?: {
		prompt_tokens?: number;
		completion_tokens?: number;
		total_tokens?: number;
	} | null,
): LanguageModelV3Usage {
	return {
		inputTokens: {
			total: usage?.prompt_tokens ?? undefined,
			noCache: undefined,
			cacheRead: undefined,
			cacheWrite: undefined,
		},
		outputTokens: {
			total: usage?.completion_tokens ?? undefined,
			text: undefined,
			reasoning: undefined,
		},
	};
}
