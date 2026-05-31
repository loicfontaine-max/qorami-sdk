# Qorami examples

Runnable quickstarts showing the full guard loop an AI agent should run before
sending an email: **verify → send / wait-for-human / block**, including polling
for the human decision after a review.

Get an API key in the [dashboard](https://qorami.fr/dashboard/) ("Démarrer").
Full reference: <https://qorami.fr/docs>.

## Node (18+)

```bash
QORAMI_API_KEY=qrm_ws_... node examples/node-quickstart.mjs
```

Uses the zero-dependency client in [`sdk/js/qorami.mjs`](../sdk/js/qorami.mjs).

## Python (3.9+)

```bash
QORAMI_API_KEY=qrm_ws_... python examples/python-quickstart.py
```

Uses the standard-library client in [`sdk/python/qorami.py`](../sdk/python/qorami.py).

## LangChain

See [`sdk/python/langchain_tool.py`](../sdk/python/langchain_tool.py) for a
`qorami_check_email` tool you can add to an agent's toolset so it checks every
email before sending.

## The contract

`nextAction.type` is one of:

| value | what your agent does |
|---|---|
| `send` | send the email |
| `request_human_confirmation` | pause; a human is notified and approves in the dashboard. Poll `GET /api/email-actions/:id` until it becomes `send` or `do_not_send` |
| `do_not_send` | do not send |
