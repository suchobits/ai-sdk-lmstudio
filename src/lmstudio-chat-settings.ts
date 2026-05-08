import type { FetchFunction } from '@ai-sdk/provider-utils';

export interface LmstudioChatSettings {
  /**
   * LM Studio context overflow policy.
   */
  contextOverflowPolicy?: 'stopAtLimit' | 'truncateMiddle' | 'rollingWindow';
}

export interface LmstudioProviderSettings {
  /**
   * Base URL for the LM Studio API.
   * @default 'http://localhost:1234/v1'
   */
  baseURL?: string;

  /**
   * Custom headers for all requests.
   */
  headers?: Record<string, string>;

  /**
   * Custom fetch implementation.
   */
  fetch?: FetchFunction;
}

export interface LmstudioConfig {
  provider: string;
  baseURL: string;
  headers: () => Record<string, string | undefined>;
  fetch?: FetchFunction;
}
