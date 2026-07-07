# TODO

## Runtime

- [ ] Add an HTTP adapter with a `/api/messages` endpoint.
- [ ] Add typed activity helpers for events, attachments, and command activities.
- [ ] Add dialog primitives for multi-turn workflows.
- [ ] Add middleware ordering tests.
- [ ] Add runtime error handling middleware.

## Skills

- [ ] Add a skill manifest format.
- [ ] Add skill loading from a directory.
- [ ] Add examples for command-only, dialog, and tool-using skills.
- [ ] Add skill-level tests and fixtures.

## Open Source AI Providers

- [ ] Add an Ollama provider adapter.
- [ ] Add a llama.cpp provider adapter.
- [ ] Add a vLLM provider adapter.
- [ ] Add provider contract tests.
- [ ] Keep cloud providers optional and outside the core runtime.

## Memory and Knowledge

- [ ] Add persistent state store adapters.
- [ ] Add pgvector integration.
- [ ] Add Qdrant integration.
- [ ] Add document ingestion examples.
- [ ] Add retrieval middleware for skills that need context.

## Observability

- [ ] Add OpenTelemetry tracing.
- [ ] Add structured logs.
- [ ] Add runtime metrics for turns, skill routing, errors, and latency.
- [ ] Add a local Grafana/Prometheus example.

## Developer Experience

- [ ] Add `npm run lint`.
- [ ] Add `npm run format`.
- [ ] Add TypeScript migration plan.
- [ ] Add Dockerfile.
- [ ] Add Docker Compose for local development.

## GitHub

- [ ] Add repository topics after first push.
- [ ] Enable branch protection for `main`.
- [ ] Require CI before merge.
- [ ] Add release workflow.
- [ ] Add project board for roadmap tracking.
