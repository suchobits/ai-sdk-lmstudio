import type { ProviderV1 } from '@ai-sdk/provider';
import { withoutTrailingSlash } from '@ai-sdk/provider-utils';
import type { LmstudioChatSettings, LmstudioProviderSettings } from './lmstudio-chat-settings.js';
import { LmstudioChatLanguageModel } from './lmstudio-chat-language-model.js';
import { LmstudioEmbeddingModel } from './lmstudio-embedding-model.js';

export interface LmstudioProvider extends ProviderV1 {
  (modelId: string, settings?: LmstudioChatSettings): LmstudioChatLanguageModel;

  chat(
    modelId: string,
    settings?: LmstudioChatSettings,
  ): LmstudioChatLanguageModel;

  languageModel(
    modelId: string,
    settings?: LmstudioChatSettings,
  ): LmstudioChatLanguageModel;

  textEmbeddingModel(modelId: string): LmstudioEmbeddingModel;
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

  const provider = function (
    modelId: string,
    settings?: LmstudioChatSettings,
  ) {
    if (new.target) {
      throw new Error(
        'The LM Studio provider cannot be called with the new keyword.',
      );
    }
    return createChatModel(modelId, settings);
  } as LmstudioProvider;

  provider.languageModel = createChatModel;
  provider.chat = createChatModel;
  provider.textEmbeddingModel = createEmbeddingModel;

  return provider;
}
