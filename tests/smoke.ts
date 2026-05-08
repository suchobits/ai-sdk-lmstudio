import { lmstudio } from '../src/index.js';

async function testGenerate() {
  console.log('=== doGenerate ===');
  const model = lmstudio('qwen/qwen3.6-27b');
  const result = await model.doGenerate({
    inputFormat: 'prompt',
    mode: { type: 'regular' },
    prompt: [
      { role: 'user', content: [{ type: 'text', text: 'Say "hello world" and nothing else.' }] },
    ],
    maxTokens: 500,
  });
  console.log('Text:', result.text);
  console.log('Reasoning:', result.reasoning);
  console.log('Finish reason:', result.finishReason);
  console.log('Usage:', result.usage);
  console.log('Response ID:', result.response?.id);
  console.log();
}

async function testStream() {
  console.log('=== doStream ===');
  const model = lmstudio('qwen/qwen3.6-27b');
  const { stream } = await model.doStream({
    inputFormat: 'prompt',
    mode: { type: 'regular' },
    prompt: [
      { role: 'user', content: [{ type: 'text', text: 'Count from 1 to 5, one number per line.' }] },
    ],
    maxTokens: 100,
  });

  let hasReasoning = false;
  for await (const part of stream) {
    if (part.type === 'reasoning') {
      if (!hasReasoning) { process.stdout.write('Reasoning: '); hasReasoning = true; }
      process.stdout.write(part.textDelta);
    } else if (part.type === 'text-delta') {
      if (hasReasoning) { console.log(); hasReasoning = false; process.stdout.write('Text: '); }
      process.stdout.write(part.textDelta);
    } else if (part.type === 'finish') {
      console.log();
      console.log('Finish reason:', part.finishReason);
      console.log('Usage:', part.usage);
    }
  }
  console.log();
}

async function testEmbedding() {
  console.log('=== doEmbed ===');
  const model = lmstudio.textEmbeddingModel('text-embedding-nomic-embed-text-v1.5');
  const result = await model.doEmbed({
    values: ['Hello world', 'Goodbye world'],
  });
  console.log('Embeddings count:', result.embeddings.length);
  console.log('First embedding dims:', result.embeddings[0].length);
  console.log('Usage:', result.usage);
  console.log();
}

async function main() {
  try {
    await testGenerate();
    await testStream();
    await testEmbedding();
    console.log('All smoke tests passed!');
  } catch (error) {
    console.error('Smoke test failed:', error);
    process.exit(1);
  }
}

main();
