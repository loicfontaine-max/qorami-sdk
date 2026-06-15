# qorami

Zero-dependency JS/TS client for [Qorami](https://qorami.fr) — a control point
between your AI agents and sending email. Before each send, the agent asks
Qorami, which answers **send**, **request_human_confirmation**, or **do_not_send**.

## Install

```bash
npm i qorami
```

Node 18+ (uses the global `fetch`).

## Use

```js
import { QoramiClient } from 'qorami'

const qorami = new QoramiClient({ apiKey: process.env.QORAMI_API_KEY })

await qorami.guard(
  { recipient, subject, body, policyProfile: 'sales' },
  {
    send: () => mailer.send(),                                   // allowed
    requestHumanConfirmation: (a) => queueForHuman(a.action.id), // a human approves in the dashboard
    doNotSend: () => {},                                         // blocked
  },
)
```

`verify()` and `status()` (poll after `request_human_confirmation`) are also
available. Get an API key at <https://qorami.fr/dashboard/>; full reference at
<https://qorami.fr/docs>.

Using Claude Desktop / Cursor / Windsurf or another MCP client? Skip the SDK and
run the MCP server: `npx qorami-mcp`.

MIT
