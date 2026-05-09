import { describe, expect, it } from 'vitest';
import { mapLmstudioFinishReason } from '../src/map-lmstudio-finish-reason.js';

describe('mapLmstudioFinishReason', () => {
	it('maps "stop"', () => {
		expect(mapLmstudioFinishReason('stop')).toEqual({
			unified: 'stop',
			raw: 'stop',
		});
	});

	it('maps "length"', () => {
		expect(mapLmstudioFinishReason('length')).toEqual({
			unified: 'length',
			raw: 'length',
		});
	});

	it('maps "tool_calls"', () => {
		expect(mapLmstudioFinishReason('tool_calls')).toEqual({
			unified: 'tool-calls',
			raw: 'tool_calls',
		});
	});

	it('maps "content_filter"', () => {
		expect(mapLmstudioFinishReason('content_filter')).toEqual({
			unified: 'content-filter',
			raw: 'content_filter',
		});
	});

	it('maps null to other with undefined raw', () => {
		expect(mapLmstudioFinishReason(null)).toEqual({
			unified: 'other',
			raw: undefined,
		});
	});

	it('maps undefined to other with undefined raw', () => {
		expect(mapLmstudioFinishReason(undefined)).toEqual({
			unified: 'other',
			raw: undefined,
		});
	});

	it('maps unknown strings to other', () => {
		expect(mapLmstudioFinishReason('something_else')).toEqual({
			unified: 'other',
			raw: 'something_else',
		});
	});
});
