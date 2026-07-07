# Riluvi AI

Built by Chronokairo.

Riluvi AI is an open source assistant runtime for building text, voice, and workflow agents around a shared activity, middleware, state, and skill model.

The architecture is inspired by official Microsoft Cortana and Bot Framework practices: command-driven interactions, activities, turn contexts, middleware, state scopes, dialogs, and pluggable skills. The implementation is independent and open source-first, so Riluvi can run with local models, open source vector stores, and self-hosted infrastructure.

## Brand Direction

Riluvi can work both as the name of the assistant and as a product platform:

- Riluvi Code: engineering and code automation
- Riluvi Flow: workflow and operations automation
- Riluvi Agent: autonomous task execution
- Riluvi Assist: conversational productivity assistant

Recommended product signature:

```text
Riluvi AI
Built by Chronokairo.
```

Alternative institutional signature:

```text
Riluvi
Inteligência artificial da Chronokairo.
```

## Open Source Direction

Riluvi copies the durable architecture patterns, not the deprecated platform dependencies.

- Runtime owned by this repository.
- Local-first by default.
- LLM provider adapters are optional and replaceable.
- Vector stores are optional and replaceable.
- Telemetry is based on open standards.
- Deployment should work with Docker, Compose, and common cloud hosts.

Recommended open source integrations:

- Local LLMs: Ollama, llama.cpp, vLLM
- Vector stores: Qdrant, Chroma, LanceDB, pgvector
- Observability: OpenTelemetry, Prometheus, Grafana
- Deployment: Docker, Docker Compose, Kubernetes

## What This Starter Includes

- A zero-dependency Node.js CLI.
- An activity-based assistant runtime.
- A middleware pipeline for cross-cutting behavior.
- In-memory state scoped by user and conversation.
- Example skills for greetings, product information, and task planning.
- A simple extension pattern for adding new Riluvi capabilities.

## Project Structure

```text
.
├── examples/
│   └── commands.txt
├── src/
│   ├── activities/
│   │   └── activity.js
│   ├── adapters/
│   │   └── cli-adapter.js
│   ├── index.js
│   ├── middleware/
│   │   ├── fallback.js
│   │   └── logging.js
│   ├── runtime/
│   │   ├── assistant-runtime.js
│   │   ├── middleware-pipeline.js
│   │   └── turn-context.js
│   ├── skills/
│   │   ├── greeting.js
│   │   ├── planning.js
│   │   └── products.js
│   └── state/
│       └── memory-state-store.js
├── .env.example
├── .github/
├── .gitignore
├── package.json
└── README.md
```

## Requirements

- Node.js 20 or newer

No package installation is required for the initial version.

## Quick Start

Run a command directly:

```bash
npm start -- "what is riluvi"
```

Open the interactive shell:

```bash
npm run chat
```

Try example prompts:

```bash
npm start -- "hello"
npm start -- "products"
npm start -- "plan build a customer support agent"
```

## Runtime Model

Riluvi follows a turn-based model:

1. An adapter receives input from a channel.
2. The adapter creates an activity.
3. The runtime creates a turn context.
4. Middleware can inspect, enrich, block, or log the turn.
5. A matching skill handles the activity.
6. State is saved after the turn.

This keeps channel integration, policy, memory, and skills separated.

## Skill Model

Each skill exports:

- `name`: stable skill identifier
- `description`: short purpose statement
- `examples`: sample prompts
- `canHandle(context)`: whether the skill should respond
- `handle(context)`: response generator

Example:

```js
export const greetingSkill = {
  name: "greeting",
  description: "Responds to greetings and introduces Riluvi AI.",
  examples: ["hello", "hi riluvi"],
  canHandle(context) {
    return /\b(hello|hi|oi|olá|ola)\b/i.test(context.text);
  },
  handle(context) {
    return `${context.runtime.name} is online. ${context.runtime.signature}`;
  },
};
```

## Creating a New Skill

1. Create a file in `src/skills`.
2. Export a skill object with the same interface.
3. Register it in `src/index.js`.
4. Add examples to `examples/commands.txt`.

## GitHub Setup

This repository includes:

- MIT license.
- Contributor guide.
- Code of Conduct.
- Security policy.
- Bug report and feature request templates.
- Pull request template.
- GitHub Actions CI for Node.js 20 and 22.

## Documentation

Project documentation lives in [`docs/`](docs/README.md).

Agent-specific repository instructions live in [`AGENTS.md`](AGENTS.md), following the open `AGENTS.md` convention.

## Roadmap

- Add HTTP API mode.
- Add persistent memory adapters.
- Add provider adapters for LLMs and speech systems.
- Add a visual workflow builder for Riluvi Flow.
- Add agent execution policies for Riluvi Agent.
- Add product-specific packages under a future monorepo layout.

## Reference

This starter is conceptually based on Microsoft's Cortana samples repository and Bot Framework guidance, especially the ideas of activities, turn handling, middleware, state, dialogs, and skills. The implementation is independent and designed for open source use.

- https://github.com/microsoft/cortana-samples
- https://github.com/microsoft/BotBuilder-Samples
- https://learn.microsoft.com/en-us/azure/bot-service/bot-service-overview?view=azure-bot-service-4.0
