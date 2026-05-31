// Qorami quickstart (Node 18+). Shows the full guard loop an agent should run
// before sending an email: verify -> send / wait-for-human / block, and how to
// poll for the human decision after a review.
//
// Run:  QORAMI_API_KEY=qrm_ws_... node examples/node-quickstart.mjs
//
// Uses the zero-dependency client from ../sdk/js/qorami.mjs.

import { QoramiClient } from '../sdk/js/qorami.mjs'

const apiKey = process.env.QORAMI_API_KEY
if (!apiKey) {
  console.error('Set QORAMI_API_KEY (get one in the dashboard: https://qorami.fr/dashboard/).')
  process.exit(1)
}

const qorami = new QoramiClient({ apiKey })

// The email your AI agent wants to send.
const email = {
  recipient: 'client@example.com',
  subject: 'Suivi de notre échange',
  body: 'Bonjour, merci pour votre temps aujourd’hui. Je reviens vers vous avec les prochaines étapes.',
  policyProfile: 'sales',
}

// Pretend "send" function — replace with your real mailer.
async function actuallySendEmail() {
  console.log('📤 sending the email via your mailer...')
}

// Poll an action until a human resolves it (Authorized -> send, Blocked -> drop).
async function waitForHumanDecision(actionId, { tries = 20, intervalMs = 5000 } = {}) {
  for (let i = 0; i < tries; i += 1) {
    const { status, nextAction } = await qorami.status(actionId)
    if (nextAction.type === 'send') return 'approved'
    if (nextAction.type === 'do_not_send') return 'blocked'
    console.log(`⏳ still ${status} — waiting for a human to approve in the dashboard...`)
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  return 'timeout'
}

const result = await qorami.verify(email)
console.log(`Qorami says: ${result.nextAction.type} (decision: ${result.decision})`)

if (result.nextAction.type === 'send') {
  await actuallySendEmail()
} else if (result.nextAction.type === 'request_human_confirmation') {
  console.log(`🙋 needs human approval — action ${result.action.id}. The owner was notified by email.`)
  const outcome = await waitForHumanDecision(result.action.id)
  if (outcome === 'approved') await actuallySendEmail()
  else console.log(`🚫 not sending (${outcome}).`)
} else {
  console.log(`⛔ blocked — not sending. Reason: ${result.nextAction.reason}`)
}
