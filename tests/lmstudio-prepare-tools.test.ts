import { describe, it, expect } from 'vitest';
import { prepareTools } from '../src/lmstudio-prepare-tools.js';

describe('prepareTools', () => {
  it('handles regular mode with no tools', () => {
    const result = prepareTools({ type: 'regular' });
    expect(result.tools).toBeUndefined();
    expect(result.tool_choice).toBeUndefined();
    expect(result.response_format).toBeUndefined();
  });

  it('handles regular mode with function tools', () => {
    const result = prepareTools({
      type: 'regular',
      tools: [
        {
          type: 'function',
          name: 'get_weather',
          description: 'Get weather for a city',
          parameters: {
            type: 'object',
            properties: { city: { type: 'string' } },
            required: ['city'],
          },
        },
      ],
      toolChoice: { type: 'auto' },
    });

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
    const result = prepareTools({
      type: 'regular',
      tools: [
        {
          type: 'function',
          name: 'fn',
          parameters: { type: 'object' },
        },
      ],
      toolChoice: { type: 'required' },
    });

    expect(result.tool_choice).toBe('required');
  });

  it('maps specific tool choice', () => {
    const result = prepareTools({
      type: 'regular',
      tools: [
        {
          type: 'function',
          name: 'my_tool',
          parameters: { type: 'object' },
        },
      ],
      toolChoice: { type: 'tool', toolName: 'my_tool' },
    });

    expect(result.tool_choice).toEqual({
      type: 'function',
      function: { name: 'my_tool' },
    });
  });

  it('handles object-json mode', () => {
    const result = prepareTools({ type: 'object-json' });
    expect(result.tools).toBeUndefined();
    expect(result.response_format).toEqual({ type: 'json_object' });
  });

  it('handles object-json mode with schema', () => {
    const schema = { type: 'object', properties: { name: { type: 'string' } } };
    const result = prepareTools({ type: 'object-json', schema });
    expect(result.response_format).toEqual({
      type: 'json_schema',
      schema,
    });
  });

  it('handles object-tool mode', () => {
    const result = prepareTools({
      type: 'object-tool',
      tool: {
        type: 'function',
        name: 'output',
        description: 'Output the result',
        parameters: {
          type: 'object',
          properties: { value: { type: 'string' } },
        },
      },
    });

    expect(result.tools).toHaveLength(1);
    expect(result.tool_choice).toEqual({
      type: 'function',
      function: { name: 'output' },
    });
  });
});
