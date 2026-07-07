<div align="center">

# Nous

**Open-source AI agent platform** — runtime, SDK, multi-tenant server, and editor LLM bridges.

Built by [Chronokairo](https://github.com/chronokairo).

</div>

---

Nous is the AI-infra stack that powers Chronokairo's products. It is composed of
four independent packages that work together but can be used separately.

## Packages

| Package | Path | Role |
|---|---|---|
| **riluvi** | [`packages/riluvi`](packages/riluvi) | Open-source AI assistant **runtime** (the internal core of Nous) |
| **sdk** | [`packages/sdk`](packages/sdk) | Embedded **provider client**, OpenAI-compatible transport, and sandbox runtime |
| **server** | [`packages/server`](packages/server) | **Multi-tenant agent host** implementing the Direct Connect protocol |
| **bridges** | [`packages/bridges`](packages/bridges) | **Editor LLM bridges** — VS Code extensions (Copilot / Windsurf) exposed as an Ollama-compatible HTTP API |

## Repository structure

```
nous/
├── packages/
│   ├── riluvi/     # AI assistant runtime
│   ├── sdk/        # provider client + transport + sandbox
│   ├── server/     # multi-tenant agent host (Direct Connect)
│   └── bridges/    # editor LLM bridges (VS Code)
└── docs/
```

Each package is self-contained and ships its own README with build/run instructions.

## Status

Early stage. APIs and protocols are still evolving. Not all packages publish
releases yet — see each package's README for details.

## License

[MIT](LICENSE) © Chronokairo
