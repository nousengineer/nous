// Layer 6: Guardrails — PII detection, content policy, compliance
export interface GuardrailResult {
  allowed: boolean
  reason: string
  detections: Detection[]
}

export interface Detection {
  type: 'pii' | 'forbidden_content' | 'prompt_injection' | 'compliance'
  severity: 'low' | 'medium' | 'high'
  match: string
  position?: string
}

// PII patterns
const PII_PATTERNS: Array<{ type: string; pattern: RegExp; severity: Detection['severity'] }> = [
  { type: 'ssn',         pattern: /\b\d{3}-\d{2}-\d{4}\b/,                       severity: 'high'   },
  { type: 'credit_card', pattern: /\b(?:\d[ -]?){13,16}\b/,                       severity: 'high'   },
  { type: 'email',       pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}\b/, severity: 'low' },
  { type: 'phone_br',    pattern: /\b(?:\+55|0)?\s*\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}\b/, severity: 'medium' },
  { type: 'cpf',         pattern: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/,             severity: 'high'   },
  { type: 'cnpj',        pattern: /\b\d{2}\.?\d{3}\.?\d{3}\/?0001-?\d{2}\b/,      severity: 'high'   },
  { type: 'api_key',     pattern: /\b(?:sk-|pk-|api[-_]key[:=]\s*)[a-zA-Z0-9_\-]{16,}\b/i, severity: 'high' },
]

// Forbidden content patterns
const FORBIDDEN_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'malware_request',    pattern: /(?:create|write|generate)\s+(?:malware|virus|ransomware|keylogger|exploit)/i },
  { label: 'weapon_instructions', pattern: /(?:how to|instructions? for)\s+(?:make|build|create)\s+(?:bomb|weapon|explosive)/i },
  { label: 'jailbreak',          pattern: /ignore (?:previous|all) instructions|you are now DAN|pretend you have no restrictions/i },
]

// Prompt injection
const INJECTION_PATTERNS: RegExp[] = [
  /\bignore all (?:previous|prior|above) instructions\b/i,
  /\bact as if you are\b.{0,50}\bno restrictions\b/i,
  /<\|(?:system|user|assistant)\|>/,
  /\[INST\].*\[\/INST\]/s,
]

function extractText(messages: unknown[]): string {
  return messages.map(m => {
    const msg = m as Record<string, unknown>
    if (typeof msg.content === 'string') return msg.content
    if (Array.isArray(msg.content)) {
      return msg.content.map((c: any) => typeof c === 'string' ? c : c.text ?? '').join(' ')
    }
    return ''
  }).join('\n')
}

export async function checkGuardrails(
  direction: 'input' | 'output',
  messages: unknown[],
  userId?: string,
): Promise<GuardrailResult> {
  const text = extractText(messages)
  const detections: Detection[] = []
  const piiMode = process.env.KAIROS_GUARDRAIL_PII ?? 'warn'           // 'block' | 'warn' | 'off'
  const contentMode = process.env.KAIROS_GUARDRAIL_CONTENT ?? 'block'  // 'block' | 'warn' | 'off'
  const injectionMode = process.env.KAIROS_GUARDRAIL_INJECTION ?? 'block'

  // PII detection
  if (piiMode !== 'off') {
    for (const { type, pattern, severity } of PII_PATTERNS) {
      const match = text.match(pattern)
      if (match) {
        detections.push({ type: 'pii', severity, match: match[0].slice(0, 20) + '...', position: type })
      }
    }
  }

  // Forbidden content
  if (contentMode !== 'off') {
    for (const { label, pattern } of FORBIDDEN_PATTERNS) {
      const match = text.match(pattern)
      if (match) {
        detections.push({ type: 'forbidden_content', severity: 'high', match: match[0].slice(0, 50), position: label })
      }
    }
  }

  // Prompt injection
  if (injectionMode !== 'off') {
    for (const pattern of INJECTION_PATTERNS) {
      const match = text.match(pattern)
      if (match) {
        detections.push({ type: 'prompt_injection', severity: 'high', match: match[0].slice(0, 50) })
      }
    }
  }

  const highDetections = detections.filter(d => d.severity === 'high')

  const shouldBlock =
    (piiMode === 'block' && highDetections.some(d => d.type === 'pii')) ||
    (contentMode === 'block' && highDetections.some(d => d.type === 'forbidden_content')) ||
    (injectionMode === 'block' && highDetections.some(d => d.type === 'prompt_injection'))

  if (shouldBlock) {
    const reasons = highDetections.map(d => `${d.type}:${d.position ?? d.match}`).join(', ')
    return { allowed: false, reason: `Guardrail blocked: ${reasons}`, detections }
  }

  return { allowed: true, reason: 'ok', detections }
}
