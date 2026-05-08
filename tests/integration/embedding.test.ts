import { embed, embedMany } from 'ai';
import { describe, expect, it } from 'vitest';
import { createLmstudio } from '../../src/index.js';

const EMBEDDING_MODEL = 'text-embedding-nomic-embed-text-v1.5';

const lmstudio = createLmstudio();

async function isLmStudioAvailable(): Promise<boolean> {
	try {
		const res = await fetch('http://localhost:1234/v1/models');
		return res.ok;
	} catch {
		return false;
	}
}

describe.skipIf(!(await isLmStudioAvailable()))('LM Studio embeddings', () => {
	it('generates embeddings', async () => {
		const { embedding } = await embed({
			model: lmstudio.textEmbeddingModel(EMBEDDING_MODEL),
			value: 'Hello, world!',
		});

		expect(Array.isArray(embedding)).toBe(true);
		expect(embedding.length).toBeGreaterThan(0);
		for (const val of embedding) {
			expect(typeof val).toBe('number');
		}
	});

	it('generates batch embeddings', async () => {
		const { embeddings } = await embedMany({
			model: lmstudio.textEmbeddingModel(EMBEDDING_MODEL),
			values: ['Hello, world!', 'Goodbye, world!'],
		});

		expect(embeddings).toHaveLength(2);
		for (const embedding of embeddings) {
			expect(Array.isArray(embedding)).toBe(true);
			expect(embedding.length).toBeGreaterThan(0);
			for (const val of embedding) {
				expect(typeof val).toBe('number');
			}
		}
	});
});
