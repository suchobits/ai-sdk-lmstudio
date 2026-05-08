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
			inputTokens: 10,
			outputTokens: 20,
			totalTokens: 30,
		});
	});

	it('defaults to undefined when fields are missing', () => {
		expect(mapLmstudioUsage({})).toEqual({
			inputTokens: undefined,
			outputTokens: undefined,
			totalTokens: undefined,
		});
	});

	it('defaults to undefined when usage is undefined', () => {
		expect(mapLmstudioUsage(undefined)).toEqual({
			inputTokens: undefined,
			outputTokens: undefined,
			totalTokens: undefined,
		});
	});
});
