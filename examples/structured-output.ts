import { generateObject } from 'ai';
import { lmstudio } from 'ai-sdk-lmstudio';
import { z } from 'zod';

const { object } = await generateObject({
  model: lmstudio('qwen2.5-coder-7b'),
  schema: z.object({
    name: z.string().describe('Recipe name'),
    ingredients: z.array(
      z.object({
        item: z.string(),
        amount: z.string(),
      }),
    ),
    steps: z.array(z.string()).describe('Cooking steps in order'),
    prepTimeMinutes: z.number(),
  }),
  prompt: 'Generate a recipe for chocolate chip cookies.',
});

console.log('Recipe:', object.name);
console.log('Prep time:', object.prepTimeMinutes, 'minutes');
console.log('Ingredients:');
for (const { item, amount } of object.ingredients) {
  console.log(`  - ${amount} ${item}`);
}
console.log('Steps:');
object.steps.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
