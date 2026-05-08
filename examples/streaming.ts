import { streamText } from 'ai';
import { lmstudio } from 'ai-sdk-lmstudio';

const result = streamText({
  model: lmstudio('qwen2.5-coder-7b'),
  prompt: 'Write a short poem about open-source software.',
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}

console.log();
console.log('Tokens used:', await result.usage);
