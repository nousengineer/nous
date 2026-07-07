# Editor LLM Bridges

Duas extensões VS Code independentes que expõem os modelos de linguagem do seu editor como uma **API HTTP compatível com Ollama**.

| Extensão | Editor / Fonte do LLM |
|---|---|
| `vscode-llm-server` | VS Code + GitHub Copilot |
| `antigravity-llm-server` | Windsurf / Antigravity ("Cascade") |

---

## vscode-llm-server

Expõe os modelos do GitHub Copilot disponíveis no VS Code (`gpt-4o:copilot`, etc.) via API Ollama em `http://127.0.0.1:11434`.

```bash
cd vscode-llm-server
pnpm install && pnpm build && pnpm package
```

## antigravity-llm-server

Expõe os modelos do Windsurf Antigravity ("Cascade") via API Ollama em `http://127.0.0.1:11434`. Inclui probing do language server proprietário via engenharia reversa.

```bash
cd antigravity-llm-server
pnpm install && pnpm build && pnpm package
```

## API (ambos)

| Método | Path | Descrição |
|--------|------|----------|
| `GET` | `/` | Liveness check |
| `GET` | `/api/tags` | Lista modelos disponíveis |
| `GET` | `/v1/models` | Lista (formato OpenAI) |
| `POST` | `/api/chat` | Chat completion (stream + non-stream) |
| `POST` | `/api/generate` | Generate completion |
| `POST` | `/api/show` | Detalhes do modelo |

## Uso

```bash
curl http://127.0.0.1:11434/api/chat -d '{
  "model": "gpt-4o:copilot",
  "messages": [{"role": "user", "content": "hello"}]
}'
```

Qualquer ferramenta Ollama-compatível (Continue.dev, Aider, Open WebUI) funciona sem modificações.

## Licença

MIT
