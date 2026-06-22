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

Install the matching extra and import the drop-in `qorami_check_email` wrapper
(each returns `ALLOWED` / `NEEDS HUMAN APPROVAL` / `BLOCKED`):

```bash
pip install qorami[langchain]      # from qorami_langchain import build_qorami_tool
pip install qorami[crewai]         # from qorami_crewai import QoramiEmailGuard
pip install qorami[llamaindex]     # from qorami_llamaindex import build_qorami_tool
pip install qorami[openai-agents]  # from qorami_openai_agents import qorami_check_email
```

For no-code workflows (n8n), use a plain HTTP Request node — see the repo's `n8n/`.

Using Claude Desktop / Cursor / Windsurf or another MCP client? Skip the SDK and
run the MCP server: `npx qorami-mcp`.

MIT
