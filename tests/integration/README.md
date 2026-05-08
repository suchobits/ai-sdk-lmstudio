# Integration Tests

These tests run against a live LM Studio instance and are skipped automatically
when LM Studio is not available at `http://localhost:1234`.

## Prerequisites

1. Install and launch [LM Studio](https://lmstudio.ai/).
2. Load the models used by the tests:
   - **Chat**: `qwen2.5-coder-7b` (used in `chat.test.ts`)
   - **Embedding**: `text-embedding-nomic-embed-text-v1.5` (used in `embedding.test.ts`)
3. Start the local server (default port 1234).

If your loaded models have different IDs, update the `MODEL` / `EMBEDDING_MODEL`
constants at the top of each test file.

## Running

```bash
pnpm test:integration
```
