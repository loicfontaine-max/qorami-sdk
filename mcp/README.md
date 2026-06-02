# Qorami MCP server

Exposes Qorami as native [Model Context Protocol](https://modelcontextprotocol.io)
tools, so any MCP client (Claude Desktop, IDEs, agent frameworks) can check email
before sending. Tools:

- **`verify_email`** — get the decision (send / request_human_confirmation / do_not_send) + suggestions.
- **`check_action_status`** — poll a pending action until a human approves/blocks.

## Run

```bash
npm install            # installs the pinned deps from package.json
QORAMI_API_KEY=qrm_ws_... node qorami-mcp.mjs
```

Or with Docker:

```bash
docker build -t qorami-mcp .
docker run -i -e QORAMI_API_KEY=qrm_ws_... qorami-mcp
```

The server starts even without a key so clients can list the tools; a key is only
needed to actually call them. Tested against `@modelcontextprotocol/sdk` 1.29.x
(Node 18+). Get an API key in the [dashboard](https://qorami.fr/dashboard/).

## Register in Claude Desktop

Add to `claude_desktop_config.json` (Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "qorami": {
      "command": "node",
      "args": ["/absolute/path/to/sdk/mcp/qorami-mcp.mjs"],
      "env": { "QORAMI_API_KEY": "qrm_ws_..." }
    }
  }
}
```

Restart Claude Desktop; the `verify_email` tool appears. Any MCP-compatible client
(Cursor, Windsurf, custom agents) registers it the same way — point it at the
script over stdio.

## The contract

The agent must obey `verify_email`'s `nextAction.type`:

| `nextAction.type` | What the agent does | Runs unattended? |
| --- | --- | --- |
| `send` | Send the email. | ✅ yes |
| `do_not_send` | Don't send. Optionally apply `suggestions` and re-verify. | ✅ yes |
| `request_human_confirmation` | Pause. Poll `check_action_status` with the `actionId` until it flips to `send` or `do_not_send`. | ⏸ a human approves in the dashboard |

So an agent is fully autonomous on `send` / `do_not_send`; the one path that waits
for a person is `request_human_confirmation` — the human-in-the-loop on risky email
is the whole point. A `verify`-scoped key (recommended for agents) **cannot**
approve a held email itself, so it can't bypass its own review step.

## Credits

Each verification costs **1 credit** (a blocked email costs 0); `verify_email`
returns `creditsRemaining`. At zero credits the call fails — a careful agent then
treats the email as "cannot send" rather than sending blind. To keep an agent
running without anyone topping up by hand, enable **auto-recharge** in the
dashboard (save a card + a threshold). Billing is the workspace owner's job; the
agent's key only spends.

Full API (rate limits, idempotency, errors): <https://qorami.fr/docs>.
