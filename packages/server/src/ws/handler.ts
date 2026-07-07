import { WebSocketServer, WebSocket } from 'ws'
import type { Server, IncomingMessage } from 'http'
import type { SessionStore } from '../lib/session-store.js'
import type { ServerConfig } from '../lib/config.js'
import { AgentRuntime } from '../agent/runtime.js'

export function createWsServer(httpServer: Server, store: SessionStore, config: ServerConfig) {
  const wss = new WebSocketServer({ noServer: true })
  const connections = new Map<string, Set<WebSocket>>()
  const runtimes = new Map<string, AgentRuntime>()

  httpServer.on('upgrade', (req: IncomingMessage, socket, head) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`)
    const match = url.pathname.match(/^\/api\/sessions\/([^/]+)\/ws$/)
    if (!match) { socket.destroy(); return }
    const sessionId = match[1]
    if (!store.get(sessionId)) { socket.destroy(); return }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req, sessionId))
  })

  wss.on('connection', async (ws: WebSocket, _req: IncomingMessage, sessionId: string) => {
    if (!connections.has(sessionId)) connections.set(sessionId, new Set())
    connections.get(sessionId)!.add(ws)
    store.updateStatus(sessionId, 'running')

    const session = store.get(sessionId)!
    const runtime = new AgentRuntime({
      workDir: session.workDir,
      provider: session.provider || config.defaultProvider,
      model: session.model || config.defaultModel,
    })
    runtimes.set(sessionId, runtime)

    // Load MCP config if present in workspace
    const mcpJsonPath = session.workDir + '/.mcp.json'
    await runtime.init(undefined, mcpJsonPath)

    ws.send(JSON.stringify({ type: 'status', content: 'connected', metadata: { session_id: sessionId } }))

    ws.on('message', async (raw) => {
      store.touch(sessionId)
      let parsed: any
      try { parsed = JSON.parse(raw.toString()) } catch {
        ws.send(JSON.stringify({ type: 'error', content: 'invalid JSON' }))
        return
      }

      if (parsed.type === 'user') {
        const text = typeof parsed.message?.content === 'string' ? parsed.message.content : parsed.message?.content?.[0]?.text
        if (!text) return

        runtime.pushHistory({ role: 'user', content: text })
        await streamLoop(ws, runtime)
        return
      }

      if (parsed.type === 'tool_result') {
        runtime.pushHistory({
          role: 'user',
          content: [{
            type: 'tool_use',
            id: parsed.tool_use_id,
            name: parsed.name || '',
            input: {},
          }, {
            type: 'tool_result',
            tool_use_id: parsed.tool_use_id,
            content: parsed.content,
            is_error: parsed.is_error,
          }] as any,
        })
        await streamLoop(ws, runtime)
      }
    })

    ws.on('close', () => {
      connections.get(sessionId)?.delete(ws)
      if (connections.get(sessionId)?.size === 0) {
        store.updateStatus(sessionId, 'idle')
        runtimes.delete(sessionId)
      }
    })
  })

  return wss
}

async function streamLoop(ws: WebSocket, runtime: AgentRuntime) {
  try {
    const stream = await runtime.callLlm()
    let assistantBlocks: any[] = []
    let pendingToolUse: any = null

    for await (const event of stream) {
      ws.send(JSON.stringify(event))

      if (event.type === 'content_block_start') {
        if (event.content_block?.type === 'text') {
          pendingToolUse = null
          assistantBlocks.push({ type: 'text', text: event.content_block.text || '' })
        } else if (event.content_block?.type === 'tool_use') {
          pendingToolUse = {
            type: 'tool_use',
            id: event.content_block.id || '',
            name: event.content_block.name || '',
            input: event.content_block.input || {},
          }
          assistantBlocks.push(pendingToolUse)
        }
      } else if (event.type === 'content_block_delta') {
        if (event.delta?.type === 'text_delta' && !pendingToolUse) {
          const last = assistantBlocks[assistantBlocks.length - 1]
          if (last?.type === 'text') last.text += event.delta.text || ''
        } else if (event.delta?.type === 'input_json_delta' && pendingToolUse) {
          try { pendingToolUse.input = { ...pendingToolUse.input, ...JSON.parse((event.delta as any).partial_json || '{}') } } catch {}
        }
      }
    }

    if (assistantBlocks.length > 0) {
      runtime.pushHistory({ role: 'assistant', content: assistantBlocks })
    }

    const hasToolUse = assistantBlocks.some(b => b.type === 'tool_use')
    if (!hasToolUse) {
      ws.send(JSON.stringify({ type: 'agent', content: '', metadata: { done: true } }))
    }
  } catch (err: any) {
    ws.send(JSON.stringify({ type: 'error', content: err.message || String(err) }))
  }
}
