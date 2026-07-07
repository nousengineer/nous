import { createServer } from 'node:http'
import { parse } from 'node:url'
import next from 'next'
import { loadConfig, hasFirebase } from './src/lib/config.js'
import { initFirebase } from './src/lib/firebase.js'
import { SessionStore } from './src/lib/session-store.js'
import { createWsServer } from './src/ws/handler.js'

const config = loadConfig()
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

if (hasFirebase(config)) initFirebase(config)

const store = new SessionStore(config.workspace)
await store.init()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  })

  createWsServer(httpServer, store, config)

  httpServer.listen(config.port, config.host, () => {
    console.log(`kairos-server listening on http://${config.host}:${config.port}`)
    console.log(`  auth: ${hasFirebase(config) ? 'firebase' : 'disabled (insecure!)'}`)
    console.log(`  workspace: ${config.workspace}`)
    console.log(`  provider: ${config.defaultProvider} / ${config.defaultModel || 'default'}`)
  })
})
