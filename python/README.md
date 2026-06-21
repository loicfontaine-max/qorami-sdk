# qorami

Zero-dependency Python client (standard library only) for
[Qorami](https://qorami.fr) — a control point between your AI agents and sending
email. Before each send, the agent asks Qorami, which answers **send**,
**request_human_confirmation**, or **do_not_send**.

## Install

```bash
pip install qorami
```

Python 3.8+.

## Use

```python
import os
from qorami import QoramiClient

qorami = QoramiClient(api_key=os.environ["QORAMI_API_KEY"])

result = qorami.verify(
    recipient="client@example.com",
    subject="Our offer",
    body=email_body,
    policy_profile="sales",
)

if result.next_action_type == "send":
    send_email()                       # allowed
elif result.next_action_type == "request_human_confirmation":
    queue_for_review(result.action_id) # a human approves in the dashboard
# else do_not_send: don't send
```

A `guard(...)` helper and `status(action_id)` (poll after
`request_human_confirmation`) are also available. Get an API key at
<https://qorami.fr/dashboard/>; full reference at <https://qorami.fr/docs>.

## Agent framework tools

Drop-in `qorami_check_email` tools that wrap the client for popular frameworks
(each returns `ALLOWED` / `NEEDS HUMAN APPROVAL` / `BLOCKED`):

- `langchain_tool.py` — `pip install langchain-core pydantic`
- `crewai_tool.py` — `pip install crewai pydantic`
- `llamaindex_tool.py` — `pip install llama-index-core`
- `openai_agents_tool.py` — `pip install openai-agents`

For no-code workflows (n8n), use a plain HTTP Request node — see the repo's `n8n/`.

Using Claude Desktop / Cursor / Windsurf or another MCP client? Skip the SDK and
run the MCP server: `npx qorami-mcp`.

MIT
