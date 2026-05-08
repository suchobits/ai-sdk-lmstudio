import { describe, it, expect } from 'vitest';
import { convertToLmstudioChatMessages } from '../src/convert-to-lmstudio-chat-messages.js';

describe('convertToLmstudioChatMessages', () => {
  it('converts system messages', () => {
    const { messages } = convertToLmstudioChatMessages([
      { role: 'system', content: 'You are helpful.' },
    ]);

    expect(messages).toEqual([
      { role: 'system', content: 'You are helpful.' },
    ]);
  });

  it('converts simple user text messages', () => {
    const { messages } = convertToLmstudioChatMessages([
      { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
    ]);

    expect(messages).toEqual([{ role: 'user', content: 'Hello' }]);
  });

  it('converts user messages with multiple text parts', () => {
    const { messages } = convertToLmstudioChatMessages([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Hello' },
          { type: 'text', text: 'World' },
        ],
      },
    ]);

    expect(messages).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Hello' },
          { type: 'text', text: 'World' },
        ],
      },
    ]);
  });

  it('converts user messages with image parts (Uint8Array)', () => {
    const imageData = new Uint8Array([1, 2, 3]);
    const { messages } = convertToLmstudioChatMessages([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What is this?' },
          { type: 'image', image: imageData, mimeType: 'image/png' },
        ],
      },
    ]);

    expect(messages).toHaveLength(1);
    const msg = messages[0] as { role: 'user'; content: unknown[] };
    expect(msg.content).toHaveLength(2);
    expect(msg.content[0]).toEqual({ type: 'text', text: 'What is this?' });
    expect(msg.content[1]).toMatchObject({
      type: 'image_url',
      image_url: { url: expect.stringContaining('data:image/png;base64,') },
    });
  });

  it('converts assistant messages with text', () => {
    const { messages } = convertToLmstudioChatMessages([
      {
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello back!' }],
      },
    ]);

    expect(messages).toEqual([
      { role: 'assistant', content: 'Hello back!', },
    ]);
  });

  it('converts assistant messages with tool calls', () => {
    const { messages } = convertToLmstudioChatMessages([
      {
        role: 'assistant',
        content: [
          {
            type: 'tool-call',
            toolCallId: 'call-1',
            toolName: 'get_weather',
            args: { city: 'Tokyo' },
          },
        ],
      },
    ]);

    expect(messages).toEqual([
      {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'call-1',
            type: 'function',
            function: {
              name: 'get_weather',
              arguments: '{"city":"Tokyo"}',
            },
          },
        ],
      },
    ]);
  });

  it('converts tool result messages', () => {
    const { messages } = convertToLmstudioChatMessages([
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call-1',
            toolName: 'get_weather',
            result: { temp: 20, unit: 'C' },
          },
        ],
      },
    ]);

    expect(messages).toEqual([
      {
        role: 'tool',
        tool_call_id: 'call-1',
        content: '{"temp":20,"unit":"C"}',
      },
    ]);
  });

  it('silently skips reasoning parts in assistant messages', () => {
    const { messages, warnings } = convertToLmstudioChatMessages([
      {
        role: 'assistant',
        content: [
          { type: 'reasoning', text: 'Let me think...' },
          { type: 'text', text: 'The answer is 42.' },
        ],
      },
    ]);

    expect(messages).toEqual([
      { role: 'assistant', content: 'The answer is 42.' },
    ]);
    expect(warnings).toHaveLength(0);
  });
});
