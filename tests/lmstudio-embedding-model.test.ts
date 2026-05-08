import { describe, expect, it, vi } from 'vitest';
import { LmstudioEmbeddingModel } from '../src/lmstudio-embedding-model.js';
import embeddingResponse from './__fixtures__/embedding-response.json';

function createModel(mockFetch: typeof fetch) {
	return new LmstudioEmbeddingModel('text-embedding-nomic-embed-text-v1.5', {
		provider: 'lmstudio',
		baseURL: 'http://localhost:1234/v1',
		headers: () => ({}),
		fetch: mockFetch,
	});
}

function mockJsonResponse(body: unknown) {
	return vi.fn().mockResolvedValue(
		new Response(JSON.stringify(body), {
			status: 200,
			headers: { 'content-type': 'application/json' },
		}),
	);
}

describe('LmstudioEmbeddingModel', () => {
	it('embeds a single value', async () => {
		const fetchMock = mockJsonResponse(embeddingResponse);
		const model = createModel(fetchMock);

		const result = await model.doEmbed({
			values: ['Hello world'],
		});

		expect(result.embeddings).toHaveLength(1);
		expect(result.embeddings[0]).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
		expect(result.usage).toEqual({ tokens: 3 });
	});

	it('sends correct request body', async () => {
		const fetchMock = mockJsonResponse(embeddingResponse);
		const model = createModel(fetchMock);

		await model.doEmbed({
			values: ['Hello world'],
		});

		const [url, options] = fetchMock.mock.calls[0];
		expect(url).toBe('http://localhost:1234/v1/embeddings');
		const body = JSON.parse(options.body as string);
		expect(body.model).toBe('text-embedding-nomic-embed-text-v1.5');
		expect(body.input).toEqual(['Hello world']);
	});

	it('has correct model properties', () => {
		const fetchMock = mockJsonResponse(embeddingResponse);
		const model = createModel(fetchMock);

		expect(model.specificationVersion).toBe('v2');
		expect(model.provider).toBe('lmstudio');
		expect(model.modelId).toBe('text-embedding-nomic-embed-text-v1.5');
		expect(model.maxEmbeddingsPerCall).toBe(2048);
		expect(model.supportsParallelCalls).toBe(true);
	});
});
