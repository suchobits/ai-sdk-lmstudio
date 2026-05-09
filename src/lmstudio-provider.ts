import type { ProviderV3 } from '@ai-sdk/provider';
import { withoutTrailingSlash } from '@ai-sdk/provider-utils';
import { LmstudioChatLanguageModel } from './lmstudio-chat-language-model.js';
import type {
	LmstudioChatSettings,
	LmstudioProviderSettings,
} from './lmstudio-chat-settings.js';
import { LmstudioEmbeddingModel } from './lmstudio-embedding-model.js';

export interface LmstudioProvider extends ProviderV3 {
	(modelId: string, settings?: LmstudioChatSettings): LmstudioChatLanguageModel;

	chat(
		modelId: string,
		settings?: LmstudioChatSettings,
	): LmstudioChatLanguageModel;
}

export function createLmstudio(
	options: LmstudioProviderSettings = {},
): LmstudioProvider {
	const baseURL =
		withoutTrailingSlash(options.baseURL) ?? 'http://localhost:1234/v1';

	const getHeaders = () => ({
		...options.headers,
	});

	const config = {
		provider: 'lmstudio',
		baseURL,
		headers: getHeaders,
		fetch: options.fetch,
	};

	const createChatModel = (
		modelId: string,
		settings: LmstudioChatSettings = {},
	) => new LmstudioChatLanguageModel(modelId, settings, config);

	const createEmbeddingModel = (modelId: string) =>
		new LmstudioEmbeddingModel(modelId, config);

	const providerFn = function (
		modelId: string,
		settings?: LmstudioChatSettings,
	) {
		if (new.target) {
			throw new Error(
				'The LM Studio provider cannot be called with the new keyword.',
			);
		}
		return createChatModel(modelId, settings);
	};

	const provider: LmstudioProvider = Object.assign(providerFn, {
		specificationVersion: 'v3' as const,
		languageModel: createChatModel,
		chat: createChatModel,
		embeddingModel: createEmbeddingModel,
		textEmbeddingModel: createEmbeddingModel,
		imageModel: () => {
			throw new Error('LM Studio does not support image models.');
		},
	});

	return provider;
}
