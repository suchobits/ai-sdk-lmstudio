import type { LanguageModelV2Usage } from '@ai-sdk/provider';

export function mapLmstudioUsage(
	usage?: {
		prompt_tokens?: number;
		completion_tokens?: number;
		total_tokens?: number;
	} | null,
): LanguageModelV2Usage {
	return {
		inputTokens: usage?.prompt_tokens ?? undefined,
		outputTokens: usage?.completion_tokens ?? undefined,
		totalTokens: usage?.total_tokens ?? undefined,
	};
}
