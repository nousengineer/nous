# Open Source Strategy

Riluvi is designed as an open source assistant runtime.

## What Open Source Means Here

- The core runtime can run locally.
- The runtime does not require a proprietary cloud.
- Provider integrations are optional.
- Self-hosting is a first-class path.
- Standards are preferred over vendor-specific APIs.

## Recommended Integrations

### Local LLMs

- Ollama
- llama.cpp
- vLLM

### Vector Stores

- Qdrant
- Chroma
- LanceDB
- pgvector

### Observability

- OpenTelemetry
- Prometheus
- Grafana

### Deployment

- Docker
- Docker Compose
- Kubernetes

## Compatibility Strategy

Cloud providers may be supported later, but they should not shape the core runtime.

Provider adapters should follow this rule:

```text
core runtime -> provider contract -> provider adapter
```

Never:

```text
core runtime -> provider SDK
```
