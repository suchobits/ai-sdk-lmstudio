import { generateText } from 'ai';
import { lmstudio } from 'ai-sdk-lmstudio';

const { text, reasoning } = await generateText({
  model: lmstudio('qwen3-8b'),
  prompt: 'How many r\'s are in the word "strawberry"?',
});

if (reasoning) {
  console.log('=== Chain of Thought ===');
  console.log(reasoning);
  console.log();
}

console.log('=== Answer ===');
console.log(text);
