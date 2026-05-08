# ai-sdk-lmstudio

[LM Studio](https://lmstudio.ai) provider for the [Vercel AI SDK](https://ai-sdk.dev). Run local LLMs with full AI SDK support including streaming, tool calling, structured output, and embeddings — with proper streaming token tracking.

## Installation

```bash
npm install ai-sdk-lmstudio
```

Make sure [LM Studio](https://lmstudio.ai) is running with a model loaded and the local server enabled (default: `http://localhost:1234`).

## Quick Start

```typescript
import { lmstudio } from 'ai-sdk-lmstudio';
import { generateText } from 'ai';

const { text } = await generateText({
  model: lmstudio('qwen2.5-coder-7b'),
  prompt: 'Explain TypeScript generics in one paragraph.',
});

console.log(text);
```

## Streaming

```typescript
import { lmstudio } from 'ai-sdk-lmstudio';
import { streamText } from 'ai';

const result = streamText({
  model: lmstudio('qwen2.5-coder-7b'),
  prompt: 'Write a haiku about local LLMs.',
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

## Tool Calling

```typescript
import { lmstudio } from 'ai-sdk-lmstudio';
import { generateText, tool } from 'ai';
import { z } from 'zod';

const { toolCalls } = await generateText({
  model: lmstudio('qwen2.5-coder-7b'),
  tools: {
    weather: tool({
      description: 'Get weather for a city',
      parameters: z.object({ city: z.string() }),
      execute: async ({ city }) => ({ temp: 20, city }),
    }),
  },
  prompt: 'What is the weather in Tokyo?',
});
```

## Structured Output

```typescript
import { lmstudio } from 'ai-sdk-lmstudio';
import { generateObject } from 'ai';
import { z } from 'zod';

const { object } = await generateObject({
  model: lmstudio('qwen2.5-coder-7b'),
  schema: z.object({
    recipe: z.string(),
    ingredients: z.array(z.string()),
  }),
  prompt: 'Generate a simple pasta recipe.',
});
```

## Embeddings

```typescript
import { lmstudio } from 'ai-sdk-lmstudio';
import { embed } from 'ai';

const { embedding } = await embed({
  model: lmstudio.textEmbeddingModel('text-embedding-nomic-embed-text-v1.5'),
  value: 'Hello world',
});
```

## Configuration

### Custom Base URL

```typescript
import { createLmstudio } from 'ai-sdk-lmstudio';

const provider = createLmstudio({
  baseURL: 'http://192.168.1.100:1234/v1',
});

const model = provider('qwen2.5-coder-7b');
```

### Custom Headers

```typescript
const provider = createLmstudio({
  headers: {
    Authorization: 'Bearer your-api-key',
  },
});
```

### Provider Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseURL` | `string` | `http://localhost:1234/v1` | LM Studio API base URL |
| `headers` | `Record<string, string>` | `{}` | Custom HTTP headers |
| `fetch` | `typeof fetch` | global fetch | Custom fetch implementation |

## Features

- Text generation (streaming and non-streaming)
- Tool / function calling
- Structured output (JSON mode and JSON schema)
- Embeddings
- Streaming token usage tracking via `stream_options`
- Full compatibility with AI SDK's `generateText`, `streamText`, `generateObject`, `streamObject`, and `embed`

## Requirements

- Node.js 18+
- [LM Studio](https://lmstudio.ai) running locally with a model loaded

## License

MIT
