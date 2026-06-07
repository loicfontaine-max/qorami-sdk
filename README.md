# Qorami SDK

Official clients, tool schemas and an MCP server for [Qorami](https://qorami.fr) —
a control point between your AI agents and actually sending email. Before each
send, the agent asks Qorami, which replies **send**,
**request_human_confirmation**, or **do_not_send**.

Get an API key in the [dashboard](https://qorami.fr/dashboard/).
Full API reference: <https://qorami.fr/docs>.

| Path | What |
|---|---|
| [`js/`](js) | Zero-dependency JavaScript / TypeScript client (`fetch`, Node 18+ or browser). |
| [`python/`](python) | Zero-dependency Python client (stdlib only) + a LangChain tool. |
| [`tools/`](tools) | Drop-in OpenAI function-calling & Anthropic tool-use schemas for `qorami_check_email`. |
| [`mcp/`](mcp) | Stdio MCP server (`verify_email` + `check_action_status`) for Claude Desktop, Cursor, any MCP client. |
| [`examples/`](examples) | Runnable Node & Python quickstarts. |

## JavaScript / TypeScript

```js
import { QoramiClient } from './js/qorami.mjs'

const qorami = new QoramiClient({ apiKey: process.env.QORAMI_API_KEY })

await qorami.guard(
  { recipient: 'client@example.com', subject: 'Our offer', body, policyProfile: 'sales' },
  {
    send: () => mailer.send(),                            // allowed
    requestHumanConfirmation: (r) => queue(r.action.id), // a human was notified
    doNotSend: (r) => log('blocked', r.decision),        // do not send
  },
)
```

Or step by step with `qorami.verify(...)` and, after a review, poll
`qorami.status(actionId)` until `nextAction.type === 'send'`.

## Python

```python
from qorami import QoramiClient
qorami = QoramiClient(api_key=os.environ["QORAMI_API_KEY"])

result = qorami.verify(recipient="client@example.com", subject="Our offer",
                       body=email_body, policy_profile="sales")
if result.next_action_type == "send":
    send_email()
elif result.next_action_type == "request_human_confirmation":
    queue_for_review(result.action_id)   # a human was notified by email
# else: do_not_send
```

### LangChain

[`python/langchain_tool.py`](python/langchain_tool.py) exposes a
`qorami_check_email` tool an agent can call before sending:

```python
from langchain_tool import build_qorami_tool
tool = build_qorami_tool()        # reads QORAMI_API_KEY
```

## MCP server

Register Qorami as a native tool in Claude Desktop / Cursor / any MCP client —
see [`mcp/`](mcp). It exposes `verify_email` and `check_action_status` over stdio.

## The contract

Every client returns the same decision the agent must obey via `nextAction.type`:
`send`, `request_human_confirmation` (a human approves first — poll the action),
or `do_not_send`. See <https://qorami.fr/docs>.

## Cleaned version (auto-remediation)

When an email is risky **only** because of mechanically-removable content (a leaked
secret, a suspicious link, an IBAN/card/SSN), the verify result carries a cleaned,
sendable copy — send `remediation.safeBody` instead of blocking outright:

```js
const r = await qorami.verify({ recipient, subject, body, policyProfile: 'general' })
if (r.nextAction.type === 'do_not_send' && r.remediation?.safeToSend) {
  mailer.send({ ...email, body: r.remediation.safeBody })   // safe, redacted copy
}
```

```python
r = qorami.verify(recipient=..., subject=..., body=email_body)
if r.next_action_type == "do_not_send" and (r.remediation or {}).get("safeToSend"):
    send_email(body=r.remediation["safeBody"])   # safe, redacted copy
```

`remediation.removed` lists what was stripped (e.g. `["secret", "link"]`). The MCP
server surfaces the same field.

## License

MIT — see [LICENSE](LICENSE).
