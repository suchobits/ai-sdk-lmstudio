import { embed, embedMany } from 'ai';
import { lmstudio } from 'ai-sdk-lmstudio';

// Single embedding
const { embedding } = await embed({
  model: lmstudio.textEmbeddingModel('text-embedding-nomic-embed-text-v1.5'),
  value: 'The quick brown fox jumps over the lazy dog.',
});

console.log('Single embedding dimensions:', embedding.length);
console.log('First 5 values:', embedding.slice(0, 5));

// Multiple embeddings
const { embeddings } = await embedMany({
  model: lmstudio.textEmbeddingModel('text-embedding-nomic-embed-text-v1.5'),
  values: [
    'The cat sat on the mat.',
    'The dog chased the ball.',
    'A programmer wrote some code.',
  ],
});

console.log('Number of embeddings:', embeddings.length);
for (const [i, emb] of embeddings.entries()) {
  console.log(`  Embedding ${i + 1} dimensions:`, emb.length);
}
