# Qorami tool schemas

Ready-to-paste tool definitions so any agent can register Qorami as a tool and
check email before sending. Your tool executor should POST the arguments to
`https://qorami.fr/api/verify-email` with header `x-qorami-api-key: <key>` and
return the JSON to the model (the model then obeys `nextAction.type`).

- `openai-function.json` — OpenAI / Azure OpenAI function-calling (`tools` array).
- `anthropic-tool.json` — Anthropic Messages API `tools`.
- LangChain tool: see [`../python/langchain_tool.py`](../python/langchain_tool.py).
- MCP server (Claude Desktop, IDEs, MCP clients): see [`../mcp/`](../mcp/).

## Executor sketch (Node)

```js
async function runQoramiCheckEmail(args) {
  const r = await fetch("https://qorami.fr/api/verify-email", {
    method: "POST",
    headers: { "x-qorami-api-key": process.env.QORAMI_API_KEY, "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  const d = await r.json();
  return { decision: d.verification?.decision, nextAction: d.nextAction, suggestions: d.verification?.suggestions };
}
```

The agent must obey `nextAction.type`: `send`, `request_human_confirmation`
(poll `GET /api/email-actions/:id` until resolved), or `do_not_send`.
