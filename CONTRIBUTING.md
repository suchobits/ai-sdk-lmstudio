# Contributing

Contributions are welcome! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/lrs/ai-sdk-lmstudio.git
cd ai-sdk-lmstudio
pnpm install
```

## Scripts

- `pnpm build` — Build the package
- `pnpm typecheck` — Run TypeScript type checking
- `pnpm test` — Run tests
- `pnpm test:watch` — Run tests in watch mode

## Making Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run `pnpm typecheck && pnpm test` to verify
5. Commit your changes
6. Open a pull request

## Guidelines

- Write tests for new functionality
- Keep the code simple and focused
- Follow existing patterns in the codebase
- Update the README if adding new features
