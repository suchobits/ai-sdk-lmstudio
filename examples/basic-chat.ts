import { generateText } from 'ai';
import { lmstudio } from 'ai-sdk-lmstudio';

const { text, usage } = await generateText({
  model: lmstudio('qwen2.5-coder-7b'),
  prompt: 'Explain what a closure is in JavaScript in two sentences.',
});

console.log(text);
console.log('Tokens used:', usage);
