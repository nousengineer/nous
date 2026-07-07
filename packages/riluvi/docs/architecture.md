# Architecture

Riluvi follows a turn-based assistant architecture inspired by Cortana and Bot Framework concepts.

The project copies the durable patterns, not the deprecated dependencies.

## Runtime Flow

1. An adapter receives input from a channel.
2. The adapter creates an activity.
3. The runtime creates a turn context.
4. State is loaded.
5. Middleware runs in order.
6. A skill handles the turn.
7. Fallback middleware handles unmatched turns.
8. State is saved.
9. The adapter returns the response to the channel.

## Core Concepts

### Activity

An activity is the normalized unit of input. Today, Riluvi supports message activities. Future activity types should include events, attachments, commands, and tool results.

### Adapter

An adapter connects an external channel to the runtime. The current adapter is CLI-based. Future adapters should include HTTP, WebSocket, web chat, Teams, WhatsApp, and desktop/app integrations.

### Turn Context

The turn context carries:

- the current activity
- runtime metadata
- user state
- conversation state
- the response

### Middleware

Middleware handles cross-cutting behavior such as:

- logging
- telemetry
- fallback responses
- safety checks
- authorization
- retrieval
- translation
- rate limiting

Middleware may inspect, enrich, block, or finalize a turn.

### Skill

A skill is a modular capability with:

- `name`
- `description`
- `examples`
- `canHandle(context)`
- `handle(context)`

Skills should stay focused and testable.

### State Store

State stores must be replaceable. The current implementation is in-memory and intended for local development and tests.

Future stores should include file storage, SQLite, Postgres, Redis, Azure Blob-compatible storage, and S3-compatible storage.

## Design Boundary

The core runtime must not depend directly on an LLM provider, vector database, cloud provider, or SaaS platform. Those integrations belong behind adapters or provider modules.
