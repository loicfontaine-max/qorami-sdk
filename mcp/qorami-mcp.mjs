#!/usr/bin/env node
// Qorami MCP server — exposes Qorami as native tools for any Model Context
// Protocol client (Claude Desktop, IDEs, agent frameworks). Before an agent
// sends email, it calls `verify_email` and obeys the decision.
//
// Setup:
//   npm i @modelcontextprotocol/sdk zod
//   QORAMI_API_KEY=qrm_ws_... node mcp/qorami-mcp.mjs
//
// Then register it in your MCP client (see ./README.md).

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const BASE_URL = process.env.QORAMI_BASE_URL || 'https://qorami.fr'
const API_KEY = process.env.QORAMI_API_KEY
if (!API_KEY) {
  console.error('QORAMI_API_KEY is required. Get one at https://qorami.fr/dashboard/')
  process.exit(1)
}

async function api(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'x-qorami-api-key': API_KEY, ...(body ? { 'content-type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return res.json().catch(() => ({}))
}

const server = new McpServer({ name: 'qorami', version: '1.0.0' })

server.tool(
  'verify_email',
  'Before sending ANY email, call this to get permission from Qorami. Returns a decision the agent MUST obey: send (allowed), request_human_confirmation (a human must approve first — then poll check_action_status), or do_not_send (blocked). When not allowed, "suggestions" says what to fix.',
  {
    recipient: z.string().describe('Recipient email address'),
    subject: z.string().describe('Email subject'),
    body: z.string().describe('Full email body'),
    policyProfile: z.enum(['general', 'sales', 'support', 'legal-finance']).optional().describe('Risk profile (default general)'),
  },
  async (args) => {
    const d = await api('POST', '/api/verify-email', args)
    const out = {
      decision: d.verification?.decision,
      nextAction: d.nextAction,
      suggestions: d.verification?.suggestions || [],
      actionId: d.action?.id || null,
      creditsRemaining: d.billing?.creditsRemaining,
    }
    return { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] }
  },
)

server.tool(
  'check_action_status',
  'After request_human_confirmation, poll this with the actionId until nextAction.type becomes "send" (approved) or "do_not_send" (blocked).',
  { actionId: z.string().describe('The action id returned by verify_email') },
  async ({ actionId }) => {
    const d = await api('GET', `/api/email-actions/${encodeURIComponent(actionId)}`)
    return { content: [{ type: 'text', text: JSON.stringify({ status: d.action?.status, nextAction: d.nextAction }, null, 2) }] }
  },
)

await server.connect(new StdioServerTransport())
