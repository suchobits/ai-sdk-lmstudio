---
"ai-sdk-lmstudio": patch
---

Fix type compatibility error when used alongside `ai` package by declaring `@ai-sdk/provider` and `@ai-sdk/provider-utils` as peer dependencies to prevent duplicate type installations
