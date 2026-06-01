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

Tested against `@modelcontextprotocol/sdk` 1.29.x (Node 18+). Get an API key in the
[dashboard](https://qorami.fr/dashboard/).

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

The agent must obey `nextAction.type`: `send`, `request_human_confirmation`
(poll `check_action_status`), or `do_not_send`. Full API: <https://qorami.fr/docs>.
