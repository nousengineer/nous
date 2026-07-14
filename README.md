<div align="center">

# Nous

**Open-source AI agent platform** — runtime, SDK, multi-tenant server, and editor LLM bridges.

An open-source project by [ChronoKairo](https://github.com/chronokairo).

</div>

---

Nous is the core of the **Nous Engineer** platform — an open-source AI-native
engineering stack built and maintained by
[ChronoKairo](https://github.com/chronokairo). It is composed of four
independent packages that work together but can be used separately.

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

## Ecosystem

Nous is the core platform. These companion repositories in the
[nousengineer](https://github.com/nousengineer) org extend it:

| Repository | Role |
|---|---|
| **nous-runtime** | OpenCL inference backend for legacy GPUs (GGUF runtime + kernels) |
| **[nous-coder](https://github.com/nousengineer/nous-coder)** | Rust coding agent — plan/act/verify loop with local LLM (Ollama) |
| **nous-desktop** | Desktop UI for the platform |
| **nous-labs** | Applied research and experiments |
| **nous-research** | Research notes on legacy GPU inference (Caicos XT) |

## Status

Early stage. APIs and protocols are still evolving. Not all packages publish
releases yet — see each package's README for details.

## License

[MIT](LICENSE) © ChronoKairo
