# Contributing

Riluvi is open source-first. Contributions should keep the runtime modular, local-first, and provider-agnostic.

## Development

```bash
npm test
npm start -- "what is riluvi"
```

## Guidelines

- Keep platform integrations behind adapters.
- Keep LLM providers replaceable.
- Keep state stores replaceable.
- Add tests for runtime, middleware, and skill behavior.
- Avoid hard-coding SaaS dependencies into core runtime code.

## Pull Requests

Before opening a pull request:

1. Run `npm test`.
2. Update docs when behavior changes.
3. Keep changes scoped to one concern.
