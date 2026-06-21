# Qorami in n8n — guard an email before your workflow sends it

Use this when an n8n workflow (or an AI Agent node) is about to send an email and
you want Qorami to decide **send / ask a human / block** first. No custom node
needed — it's a plain **HTTP Request** node plus an **IF** node.

You need a free Qorami API key: <https://qorami.fr/dashboard/?signup=1>.

## 1. HTTP Request node — "Qorami verify"

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `https://qorami.fr/api/verify-email` |
| Authentication | Generic → **Header Auth** |
| Header name | `x-qorami-api-key` |
| Header value | your Qorami API key (store it as an n8n credential) |
| Send Body | on, **JSON** |

Body (JSON), wiring the fields from the previous node:

```json
{
  "recipient": "={{ $json.recipient }}",
  "subject": "={{ $json.subject }}",
  "body": "={{ $json.body }}",
  "policyProfile": "sales"
}
```

`policyProfile` is one of `general`, `sales`, `support`, `legal-finance`.

The response includes `nextAction.type`, which is `send`,
`request_human_confirmation`, or `do_not_send`, plus `nextAction.reason`,
`action.id`, and (when relevant) `verification.remediation.safeBody`.

## 2. IF node — branch on the verdict

Condition (String): `={{ $json.nextAction.type }}` **equals** `send`.

- **true** → continue to your **Send Email** node (the email is cleared).
- **false** → route by `nextAction.type`:
  - `request_human_confirmation` → notify a human (Slack/email) with
    `={{ $json.action.id }}`; resume after approval (a later run can poll
    `GET https://qorami.fr/api/email-actions/{{action id}}` until it flips to `send`).
  - `do_not_send` → stop / log `={{ $json.nextAction.reason }}`.

## 3. Optional — send the cleaned version

When Qorami removed only risky content, it returns a safe rewrite. You can send
that instead of the original:

```
={{ $json.verification.remediation.safeBody || $json.body }}
```

Only trust it when `={{ $json.verification.remediation.safeToSend }}` is `true`.

## Notes

- Each traced verification costs 1 credit; blocks are free. New accounts get free
  test credits.
- Qorami never sends the email — your workflow's Send Email node does. Qorami only
  returns the decision + audit trail.
- For AI Agent nodes, expose this HTTP Request as a tool so the agent must call it
  before any send.
