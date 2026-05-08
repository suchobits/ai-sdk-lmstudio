import type { EmbeddingModelV2 } from '@ai-sdk/provider';
import {
	createJsonResponseHandler,
	postJsonToApi,
} from '@ai-sdk/provider-utils';
import { z } from 'zod';
import type { LmstudioConfig } from './lmstudio-chat-settings.js';
import { lmstudioFailedResponseHandler } from './lmstudio-error.js';

export class LmstudioEmbeddingModel implements EmbeddingModelV2<string> {
	readonly specificationVersion = 'v2' as const;
	readonly provider: string;
	readonly modelId: string;
	readonly maxEmbeddingsPerCall = 2048;
	readonly supportsParallelCalls = true;

	constructor(
		modelId: string,
		private readonly config: LmstudioConfig,
	) {
		this.provider = config.provider;
		this.modelId = modelId;
	}

	async doEmbed(options: {
		values: string[];
		abortSignal?: AbortSignal;
		headers?: Record<string, string | undefined>;
	}) {
		const { value: response } = await postJsonToApi({
			url: `${this.config.baseURL}/embeddings`,
			headers: this.config.headers(),
			body: {
				model: this.modelId,
				input: options.values,
			},
			failedResponseHandler: lmstudioFailedResponseHandler,
			successfulResponseHandler: createJsonResponseHandler(
				lmstudioEmbeddingResponseSchema,
			),
			abortSignal: options.abortSignal,
			fetch: this.config.fetch,
		});

		return {
			embeddings: response.data.map((item) => item.embedding),
			usage: response.usage
				? { tokens: response.usage.prompt_tokens }
				: undefined,
			warnings: [],
		};
	}
}

const lmstudioEmbeddingResponseSchema = z.object({
	data: z.array(
		z.object({
			embedding: z.array(z.number()),
		}),
	),
	usage: z
		.object({
			prompt_tokens: z.number(),
			total_tokens: z.number().optional(),
		})
		.optional(),
});
