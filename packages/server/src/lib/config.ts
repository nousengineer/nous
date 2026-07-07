export type ServerConfig = {
  host: string
  port: number
  authToken: string
  workspace: string
  maxSessions: number
  idleTimeoutMs: number
  logLevel: string
  defaultProvider: string
  defaultModel: string
  firebase: {
    serviceAccount: string
    projectId: string
    clientApiKey: string
    clientAuthDomain: string
  }
  github: {
    clientId: string
    clientSecret: string
    org: string
  }
}

export function loadConfig(): ServerConfig {
  return {
    host: process.env.KAIROS_HOST || '0.0.0.0',
    port: parseInt(process.env.KAIROS_PORT || '3333', 10),
    authToken: process.env.KAIROS_AUTH_TOKEN || '',
    workspace: process.env.KAIROS_WORKSPACE || process.cwd(),
    maxSessions: parseInt(process.env.KAIROS_MAX_SESSIONS || '100', 10),
    idleTimeoutMs: parseInt(process.env.KAIROS_IDLE_TIMEOUT_MS || '3600000', 10),
    logLevel: process.env.KAIROS_LOG_LEVEL || 'info',
    defaultProvider: process.env.KAIROS_DEFAULT_PROVIDER || 'chronokairo',
    defaultModel: process.env.KAIROS_DEFAULT_MODEL || '',
    firebase: {
      serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT || '',
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
      clientApiKey: process.env.VITE_FIREBASE_API_KEY || '',
      clientAuthDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      org: process.env.GITHUB_ORG || 'chronokairo',
    },
  }
}

export function hasFirebase(config: ServerConfig): boolean {
  return !!(config.firebase.serviceAccount && config.firebase.projectId)
}
