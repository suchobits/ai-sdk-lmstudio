import { describe, expect, it } from 'vitest';
import { mapLmstudioUsage } from '../src/map-lmstudio-usage.js';

describe('mapLmstudioUsage', () => {
	it('maps usage with all fields', () => {
		expect(
			mapLmstudioUsage({
				prompt_tokens: 10,
				completion_tokens: 20,
				total_tokens: 30,
			}),
		).toEqual({
			inputTokens: {
				total: 10,
				noCache: undefined,
				cacheRead: undefined,
				cacheWrite: undefined,
			},
			outputTokens: {
				total: 20,
				text: undefined,
				reasoning: undefined,
			},
		});
	});

	it('defaults to undefined when fields are missing', () => {
		expect(mapLmstudioUsage({})).toEqual({
			inputTokens: {
				total: undefined,
				noCache: undefined,
				cacheRead: undefined,
				cacheWrite: undefined,
			},
			outputTokens: {
				total: undefined,
				text: undefined,
				reasoning: undefined,
			},
		});
	});

	it('defaults to undefined when usage is undefined', () => {
		expect(mapLmstudioUsage(undefined)).toEqual({
			inputTokens: {
				total: undefined,
				noCache: undefined,
				cacheRead: undefined,
				cacheWrite: undefined,
			},
			outputTokens: {
				total: undefined,
				text: undefined,
				reasoning: undefined,
			},
		});
	});
});
