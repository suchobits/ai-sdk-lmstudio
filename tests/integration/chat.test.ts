import { generateText, streamText } from 'ai';
import { describe, expect, it } from 'vitest';
import { createLmstudio } from '../../src/index.js';

const lmstudio = createLmstudio();

async function isLmStudioAvailable(): Promise<boolean> {
	try {
		const res = await fetch('http://localhost:1234/v1/models');
		return res.ok;
	} catch {
		return false;
	}
}

async function getFirstModel(): Promise<string> {
	const res = await fetch('http://localhost:1234/v1/models');
	const data = (await res.json()) as {
		data: Array<{ id: string }>;
	};
	const chatModel = data.data.find((m) => !m.id.includes('embedding'));
	return chatModel?.id ?? data.data[0].id;
}

describe.skipIf(!(await isLmStudioAvailable()))('LM Studio chat', () => {
	let MODEL: string;

	it('generates text', async () => {
		MODEL = await getFirstModel();
		const { text } = await generateText({
			model: lmstudio(MODEL),
			prompt: 'Say hello in one sentence.',
		});

		expect(typeof text).toBe('string');
		expect(text.length).toBeGreaterThan(0);
	}, 30_000);

	it('streams text', async () => {
		const result = streamText({
			model: lmstudio(MODEL),
			prompt: 'Say the word test.',
		});

		const chunks: string[] = [];
		for await (const chunk of result.textStream) {
			chunks.push(chunk);
		}

		const fullText = chunks.join('');
		expect(fullText.length).toBeGreaterThan(0);
	}, 30_000);

	it('returns usage information', async () => {
		const { usage } = await generateText({
			model: lmstudio(MODEL),
			prompt: 'What is 2 + 2?',
		});

		expect(usage).toBeDefined();
	}, 30_000);
});
