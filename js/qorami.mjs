// Qorami JS/TS client — zero dependency, uses the global fetch (Node 18+ / browsers).
// Qorami is a control point between your AI agents and actually sending email:
// the agent asks Qorami before each send, and obeys the returned nextAction.
//
// Usage:
//   import { QoramiClient } from './qorami.mjs'
//   const qorami = new QoramiClient({ apiKey: process.env.QORAMI_API_KEY })
//   await qorami.guard(
//     { recipient, subject, body, policyProfile: 'sales' },
//     { send: () => mailer.send(...), requestHumanConfirmation: (a) => queue(a.id), doNotSend: () => {} },
//   )

const DEFAULT_BASE_URL = 'https://qorami.fr'

export class QoramiError extends Error {
  constructor(message, { code, status, requestId } = {}) {
    super(message)
    this.name = 'QoramiError'
    this.code = code
    this.status = status
    this.requestId = requestId
  }
}

export class QoramiClient {
  constructor({ apiKey, baseUrl = DEFAULT_BASE_URL, fetch: fetchImpl } = {}) {
    if (!apiKey) throw new QoramiError('A Qorami API key is required.')
    this.apiKey = apiKey
    this.baseUrl = String(baseUrl).replace(/\/$/, '')
    this._fetch = fetchImpl || globalThis.fetch
    if (!this._fetch) throw new QoramiError('No fetch implementation available; pass { fetch }.')
  }

  async _request(method, path, body) {
    const res = await this._fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'x-qorami-api-key': this.apiKey,
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = data && data.error
      throw new QoramiError(err?.message || `Qorami request failed (${res.status})`, {
        code: err?.code,
        status: res.status,
        requestId: err?.requestId || res.headers.get('x-qorami-request-id'),
      })
    }
    return data
  }

  // Verify an email before sending.
  // Returns { decision, nextAction, action, billing, remediation, raw }.
  // `remediation` (when present) carries a cleaned, sendable version of the email
  // when it was risky only because of removable content — `remediation.safeBody`
  // with `remediation.safeToSend === true` is safe to send as-is.
  async verify({ recipient, subject, body, policyProfile = 'general', agentId, idempotencyKey } = {}) {
    const data = await this._request('POST', '/api/verify-email', {
      recipient, subject, body, policyProfile, agentId, idempotencyKey,
    })
    return {
      decision: data.verification?.decision,
      nextAction: data.nextAction,
      action: data.action,
      billing: data.billing,
      remediation: data.verification?.remediation || null,
      raw: data,
    }
  }

  // Poll an action's status (after request_human_confirmation). Returns
  // { status, nextAction, action, raw }. nextAction.type is `send` once approved.
  async status(actionId) {
    const data = await this._request('GET', `/api/email-actions/${encodeURIComponent(actionId)}`)
    return { status: data.action?.status, nextAction: data.nextAction, action: data.action, raw: data }
  }

  // Convenience: verify, then dispatch to one of the handlers based on the verdict.
  // Returns whatever the chosen handler returns (or the verify result if no handler).
  async guard(payload, handlers = {}) {
    const result = await this.verify(payload)
    const type = result.nextAction?.type
    if (type === 'send') return handlers.send ? handlers.send(result) : result
    if (type === 'request_human_confirmation') {
      return handlers.requestHumanConfirmation ? handlers.requestHumanConfirmation(result) : result
    }
    return handlers.doNotSend ? handlers.doNotSend(result) : result
  }
}

export default QoramiClient
