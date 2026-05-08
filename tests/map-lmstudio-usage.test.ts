import { describe, it, expect } from 'vitest';
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
      promptTokens: 10,
      completionTokens: 20,
    });
  });

  it('defaults to 0 when fields are missing', () => {
    expect(mapLmstudioUsage({})).toEqual({
      promptTokens: 0,
      completionTokens: 0,
    });
  });

  it('defaults to 0 when usage is undefined', () => {
    expect(mapLmstudioUsage(undefined)).toEqual({
      promptTokens: 0,
      completionTokens: 0,
    });
  });
});
