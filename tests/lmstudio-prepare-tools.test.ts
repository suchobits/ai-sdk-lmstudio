import { describe, expect, it } from 'vitest';
import { prepareTools } from '../src/lmstudio-prepare-tools.js';

describe('prepareTools', () => {
	it('handles no tools', () => {
		const result = prepareTools(undefined, undefined);
		expect(result.tools).toBeUndefined();
		expect(result.tool_choice).toBeUndefined();
	});

	it('handles function tools', () => {
		const result = prepareTools(
			[
				{
					type: 'function',
					name: 'get_weather',
					description: 'Get weather for a city',
					inputSchema: {
						type: 'object',
						properties: { city: { type: 'string' } },
						required: ['city'],
					},
				},
			],
			{ type: 'auto' },
		);

		expect(result.tools).toEqual([
			{
				type: 'function',
				function: {
					name: 'get_weather',
					description: 'Get weather for a city',
					parameters: {
						type: 'object',
						properties: { city: { type: 'string' } },
						required: ['city'],
					},
				},
			},
		]);
		expect(result.tool_choice).toBe('auto');
	});

	it('maps tool choice "required"', () => {
		const result = prepareTools(
			[{ type: 'function', name: 'fn', inputSchema: { type: 'object' } }],
			{ type: 'required' },
		);
		expect(result.tool_choice).toBe('required');
	});

	it('maps tool choice "none"', () => {
		const result = prepareTools(
			[{ type: 'function', name: 'fn', inputSchema: { type: 'object' } }],
			{ type: 'none' },
		);
		expect(result.tool_choice).toBe('none');
	});

	it('maps specific tool choice', () => {
		const result = prepareTools(
			[
				{
					type: 'function',
					name: 'my_tool',
					inputSchema: { type: 'object' },
				},
			],
			{ type: 'tool', toolName: 'my_tool' },
		);

		expect(result.tool_choice).toEqual({
			type: 'function',
			function: { name: 'my_tool' },
		});
	});

	it('warns about provider-defined tools', () => {
		const result = prepareTools(
			[
				{ type: 'provider-defined', id: 'test', name: 'test', args: {} } as any,
				{
					type: 'function',
					name: 'fn',
					inputSchema: { type: 'object' },
				},
			],
			undefined,
		);

		expect(result.tools).toHaveLength(1);
		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0].message).toContain('Provider-defined tools');
	});
});
