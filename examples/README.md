# ai-sdk-lmstudio Examples

Practical examples showing how to use the `ai-sdk-lmstudio` provider with the Vercel AI SDK.

## Prerequisites

- [LM Studio](https://lmstudio.ai/) running locally with a model loaded
- Node.js >= 20
- Dependencies installed: `pnpm install`

## Running Examples

```bash
npx tsx examples/basic-chat.ts
```

## Examples

| File | Description |
|------|-------------|
| `basic-chat.ts` | Simple text generation with `generateText` |
| `streaming.ts` | Stream text chunks to stdout with `streamText` |
| `tool-calling.ts` | Tool/function calling with a weather tool |
| `structured-output.ts` | Generate typed JSON objects with `generateObject` and Zod schemas |
| `embeddings.ts` | Single and batch text embeddings with `embed` and `embedMany` |
| `reasoning.ts` | Chain-of-thought reasoning with thinking models (e.g., Qwen3) |

## Notes

- The examples use placeholder model IDs (`qwen2.5-coder-7b`, `qwen3-8b`). Replace them with whatever model you have loaded in LM Studio.
- The embedding examples use `text-embedding-nomic-embed-text-v1.5` as the model ID. Load a compatible embedding model in LM Studio.
- LM Studio defaults to `http://localhost:1234`. If you changed the port, use `createLmstudio({ baseURL: 'http://localhost:YOUR_PORT/v1' })` instead of the default `lmstudio` export.
