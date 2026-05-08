import { describe, expect, it } from 'vitest';
import { mapLmstudioFinishReason } from '../src/map-lmstudio-finish-reason.js';

describe('mapLmstudioFinishReason', () => {
	it('maps "stop" to "stop"', () => {
		expect(mapLmstudioFinishReason('stop')).toBe('stop');
	});

	it('maps "length" to "length"', () => {
		expect(mapLmstudioFinishReason('length')).toBe('length');
	});

	it('maps "tool_calls" to "tool-calls"', () => {
		expect(mapLmstudioFinishReason('tool_calls')).toBe('tool-calls');
	});

	it('maps "content_filter" to "content-filter"', () => {
		expect(mapLmstudioFinishReason('content_filter')).toBe('content-filter');
	});

	it('maps null to "unknown"', () => {
		expect(mapLmstudioFinishReason(null)).toBe('unknown');
	});

	it('maps undefined to "unknown"', () => {
		expect(mapLmstudioFinishReason(undefined)).toBe('unknown');
	});

	it('maps unknown strings to "unknown"', () => {
		expect(mapLmstudioFinishReason('something_else')).toBe('unknown');
	});
});
