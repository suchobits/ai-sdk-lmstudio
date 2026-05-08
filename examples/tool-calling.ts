import { generateText, tool } from 'ai';
import { lmstudio } from 'ai-sdk-lmstudio';
import { z } from 'zod';

const { text, toolCalls, toolResults } = await generateText({
  model: lmstudio('qwen2.5-coder-7b'),
  tools: {
    getWeather: tool({
      description: 'Get the current weather for a location',
      parameters: z.object({
        location: z.string().describe('City name'),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72,
        condition: 'sunny',
      }),
    }),
  },
  prompt: 'What is the weather in San Francisco?',
});

console.log('Tool calls:', JSON.stringify(toolCalls, null, 2));
console.log('Tool results:', JSON.stringify(toolResults, null, 2));
console.log('Response:', text);
