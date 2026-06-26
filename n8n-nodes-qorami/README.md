# n8n-nodes-qorami

An [n8n](https://n8n.io) community node for **[Qorami](https://qorami.fr)** — the
control point your workflow calls **before it sends an email**. Qorami answers
**send**, **ask a human**, or **block**, with reasons, an audit trace, and (when
relevant) a cleaned, safe-to-send version.

Qorami never sends the email — your **Send Email** node does. Qorami only returns
the decision.

## Install

In n8n: **Settings → Community Nodes → Install**, then enter:

```
n8n-nodes-qorami
```

(Self-hosted n8n only; verified community nodes can also appear on n8n Cloud.)

## Credentials

Create a **Qorami API** credential with your workspace **API key** — get one free
(test credits, no card) at <https://qorami.fr/dashboard/>.

## Node: Qorami → Verify Email

Inputs: **Recipient**, **Subject**, **Body**, and a **Policy Profile**
(`general`, `sales`, `support`, `legal-finance`).

The node returns the Qorami response, including:

- `nextAction.type` → `send` | `request_human_confirmation` | `do_not_send`
- `nextAction.reason` → why
- `action.id` → the action to poll after a human review
- `verification.remediation.safeBody` → a cleaned body when the email was risky
  only because of removable content (`safeToSend` tells you if it's sendable)

### Branch on the verdict

Add an **IF** node after Qorami: condition
`{{$json.nextAction.type}}` **equals** `send`.

- **true** → continue to your **Send Email** node.
- **false** → `request_human_confirmation`: notify a human with
  `{{$json.action.id}}`; `do_not_send`: stop / log `{{$json.nextAction.reason}}`.

### Send the cleaned version (optional)

```
{{$json.verification.remediation.safeBody || $json.body}}
```

Only when `{{$json.verification.remediation.safeToSend}}` is `true`.

## Use with the n8n AI Agent

This node is exposed as a **tool** (`usableAsTool`), so an n8n **AI Agent** can be
told to call Qorami before sending any email, and obey the verdict.

## Pricing

1 traced verification = 1 credit; blocks are free. New accounts get free test
credits. Full reference: <https://qorami.fr/docs>.

## License

[MIT](LICENSE)
