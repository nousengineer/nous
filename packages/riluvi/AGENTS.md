# AGENTS.md

## Project Overview

Riluvi AI is an open source assistant runtime built by Chronokairo. It is inspired by official Microsoft Cortana and Bot Framework architecture patterns, but it does not depend on deprecated Cortana or Bot Framework SDKs.

Core ideas:

- Activities normalize input from channels.
- Adapters connect channels to the runtime.
- Turn contexts carry activity, state, runtime metadata, and response data.
- Middleware handles cross-cutting behavior.
- Skills implement product capabilities.
- State stores keep user and conversation state replaceable.

## Setup Commands

- Run tests: `npm test`
- Run one prompt: `npm start -- "what is riluvi"`
- Run chat mode: `npm run chat`

No dependency install is required in the current zero-dependency version.

## Repository Layout

- `src/activities`: activity creation and normalization.
- `src/adapters`: channel adapters.
- `src/runtime`: assistant runtime, turn context, and middleware pipeline.
- `src/middleware`: reusable turn middleware.
- `src/skills`: assistant skills.
- `src/state`: replaceable state stores.
- `test`: runtime and behavior tests.
- `docs`: human-readable project documentation.

## Code Style

- Use modern JavaScript ES modules.
- Keep core runtime provider-agnostic.
- Keep integrations behind adapters.
- Avoid hard-coded SaaS dependencies in core runtime files.
- Prefer small modules with explicit contracts.
- Keep comments sparse and useful.
- Preserve zero-dependency core unless a dependency removes real complexity.

## Testing Instructions

- Run `npm test` before committing.
- Add tests for runtime, middleware, skill routing, and state behavior when changed.
- Keep tests deterministic and local.
- Do not require network access for core tests.

## Architecture Rules

- Runtime code must not directly call LLM providers.
- Provider integrations belong in adapters or future provider modules.
- Middleware may inspect, enrich, block, log, or finalize a turn.
- Skills should read from `TurnContext` and return plain response text for now.
- State stores must be replaceable.
- Open source defaults should prefer Ollama, llama.cpp, vLLM, Qdrant, Chroma, LanceDB, pgvector, OpenTelemetry, Prometheus, and Grafana.

## Security Considerations

- Do not commit secrets, API keys, tokens, model credentials, or local `.env` files.
- Keep `.env.example` updated when environment variables are added.
- Treat future tool execution, filesystem access, and agent actions as policy-gated capabilities.
- Add approval gates before destructive or external side effects.

## Pull Request Instructions

- Keep changes focused.
- Update `README.md`, `TODO.md`, or `docs/` when behavior or architecture changes.
- Run `npm test`.
- Use clear commit messages.

## GitHub Notes

The repository is intended to be public and open source. GitHub Actions CI should stay green on `main`.
