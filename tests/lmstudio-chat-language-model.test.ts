import { describe, expect, it, vi } from 'vitest';
import { LmstudioChatLanguageModel } from '../src/lmstudio-chat-language-model.js';
import chatResponse from './__fixtures__/chat-completion-response.json';
import toolCallResponse from './__fixtures__/chat-completion-tool-call-response.json';

function createModel(mockFetch: typeof fetch) {
	return new LmstudioChatLanguageModel(
		'qwen2.5-coder-7b',
		{},
		{
			provider: 'lmstudio',
			baseURL: 'http://localhost:1234/v1',
			headers: () => ({}),
			fetch: mockFetch,
		},
	);
}

function mockJsonResponse(body: unknown) {
	return vi.fn().mockResolvedValue(
		new Response(JSON.stringify(body), {
			status: 200,
			headers: { 'content-type': 'application/json' },
		}),
	);
}

function mockStreamResponse(chunks: string[]) {
	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		start(controller) {
			for (const chunk of chunks) {
				controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
			}
			controller.enqueue(encoder.encode('data: [DONE]\n\n'));
			controller.close();
		},
	});

	return vi.fn().mockResolvedValue(
		new Response(stream, {
			status: 200,
			headers: { 'content-type': 'text/event-stream' },
		}),
	);
}

describe('LmstudioChatLanguageModel', () => {
	describe('doGenerate', () => {
		it('generates text response', async () => {
			const fetchMock = mockJsonResponse(chatResponse);
			const model = createModel(fetchMock);

			const result = await model.doGenerate({
				prompt: [
					{
						role: 'user',
						content: [{ type: 'text', text: 'Hello' }],
					},
				],
			});

			const textContent = result.content.find((c) => c.type === 'text');
			expect(textContent).toEqual({
				type: 'text',
				text: 'Hello! How can I help you today?',
			});
			expect(result.finishReason).toBe('stop');
			expect(result.usage.inputTokens).toBe(10);
			expect(result.usage.outputTokens).toBe(8);
		});

		it('sends correct request body', async () => {
			const fetchMock = mockJsonResponse(chatResponse);
			const model = createModel(fetchMock);

			await model.doGenerate({
				prompt: [
					{ role: 'system', content: 'Be concise.' },
					{
						role: 'user',
						content: [{ type: 'text', text: 'Hi' }],
					},
				],
				temperature: 0.7,
				maxOutputTokens: 100,
			});

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe('http://localhost:1234/v1/chat/completions');
			const body = JSON.parse(options.body as string);
			expect(body.model).toBe('qwen2.5-coder-7b');
			expect(body.temperature).toBe(0.7);
			expect(body.max_tokens).toBe(100);
			expect(body.messages).toEqual([
				{ role: 'system', content: 'Be concise.' },
				{ role: 'user', content: 'Hi' },
			]);
		});

		it('generates tool call response', async () => {
			const fetchMock = mockJsonResponse(toolCallResponse);
			const model = createModel(fetchMock);

			const result = await model.doGenerate({
				prompt: [
					{
						role: 'user',
						content: [{ type: 'text', text: 'What is the weather in Tokyo?' }],
					},
				],
				tools: [
					{
						type: 'function',
						name: 'get_weather',
						description: 'Get weather',
						inputSchema: {
							type: 'object',
							properties: { city: { type: 'string' } },
						},
					},
				],
				toolChoice: { type: 'auto' },
			});

			expect(result.finishReason).toBe('tool-calls');
			const toolCall = result.content.find((c) => c.type === 'tool-call');
			expect(toolCall).toEqual({
				type: 'tool-call',
				toolCallId: 'call_abc123',
				toolName: 'get_weather',
				input: '{"city":"Tokyo"}',
			});
		});

		it('includes response metadata', async () => {
			const fetchMock = mockJsonResponse(chatResponse);
			const model = createModel(fetchMock);

			const result = await model.doGenerate({
				prompt: [
					{
						role: 'user',
						content: [{ type: 'text', text: 'Hello' }],
					},
				],
			});

			expect(result.response?.id).toBe('chatcmpl-123');
			expect(result.response?.modelId).toBe('qwen2.5-coder-7b');
		});

		it('sends json_object response_format for json mode', async () => {
			const fetchMock = mockJsonResponse(chatResponse);
			const model = createModel(fetchMock);

			await model.doGenerate({
				prompt: [
					{
						role: 'user',
						content: [{ type: 'text', text: 'Return JSON' }],
					},
				],
				responseFormat: { type: 'json' },
			});

			const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
			expect(body.response_format).toEqual({ type: 'json_object' });
		});
	});

	describe('doStream', () => {
		it('streams text deltas', async () => {
			const fetchMock = mockStreamResponse([
				JSON.stringify({
					id: 'chatcmpl-stream-1',
					model: 'qwen2.5-coder-7b',
					created: 1700000000,
					choices: [
						{
							index: 0,
							delta: { content: 'Hello' },
							finish_reason: null,
						},
					],
				}),
				JSON.stringify({
					id: 'chatcmpl-stream-1',
					choices: [
						{
							index: 0,
							delta: { content: ' world' },
							finish_reason: null,
						},
					],
				}),
				JSON.stringify({
					id: 'chatcmpl-stream-1',
					choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
				}),
				JSON.stringify({
					id: 'chatcmpl-stream-1',
					choices: [],
					usage: {
						prompt_tokens: 5,
						completion_tokens: 2,
						total_tokens: 7,
					},
				}),
			]);

			const model = createModel(fetchMock);

			const { stream } = await model.doStream({
				prompt: [
					{
						role: 'user',
						content: [{ type: 'text', text: 'Say hello' }],
					},
				],
			});

			const parts = [];
			for await (const part of stream) {
				parts.push(part);
			}

			const textDeltas = parts.filter((p) => p.type === 'text-delta');
			expect(textDeltas).toHaveLength(2);
			expect(
				textDeltas.map((d) => ('delta' in d ? d.delta : '')).join(''),
			).toBe('Hello world');

			const finish = parts.find((p) => p.type === 'finish');
			expect(finish).toMatchObject({
				type: 'finish',
				finishReason: 'stop',
				usage: { inputTokens: 5, outputTokens: 2, totalTokens: 7 },
			});
		});

		it('sends stream: true in request body', async () => {
			const fetchMock = mockStreamResponse([
				JSON.stringify({
					choices: [
						{
							index: 0,
							delta: { content: 'Hi' },
							finish_reason: 'stop',
						},
					],
				}),
			]);

			const model = createModel(fetchMock);

			await model.doStream({
				prompt: [
					{
						role: 'user',
						content: [{ type: 'text', text: 'Hello' }],
					},
				],
			});

			const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
			expect(body.stream).toBe(true);
			expect(body.stream_options).toEqual({ include_usage: true });
		});
	});
});
