"""LlamaIndex tool wrapping Qorami so an agent checks an email before sending.

Requires: pip install llama-index-core  (plus qorami.py from this folder)

Example:
    import os
    from llamaindex_tool import build_qorami_tool
    tool = build_qorami_tool(api_key=os.environ["QORAMI_API_KEY"])
    # pass [tool] to your LlamaIndex agent / FunctionAgent
"""

import os
from typing import Optional

from qorami import QoramiClient

try:
    from llama_index.core.tools import FunctionTool
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "This example needs llama-index-core: pip install llama-index-core"
    ) from exc


def _verdict(result) -> str:
    kind = result.next_action_type
    reason = (result.next_action or {}).get("reason", "")
    if kind == "send":
        return f"ALLOWED: you may send this email. {reason}"
    if kind == "request_human_confirmation":
        return (
            f"NEEDS HUMAN APPROVAL: do not send yet. A human was notified. "
            f"Action id: {result.action_id}. {reason}"
        )
    return f"BLOCKED: do not send this email as-is. {reason}"


def build_qorami_tool(api_key: Optional[str] = None, base_url: str = "https://qorami.fr") -> "FunctionTool":
    client = QoramiClient(api_key=api_key or os.environ["QORAMI_API_KEY"], base_url=base_url)

    def qorami_check_email(recipient: str, subject: str, body: str, policy_profile: str = "general") -> str:
        """Before sending any email, call this to get permission from Qorami.

        Returns ALLOWED, NEEDS HUMAN APPROVAL, or BLOCKED. Always obey the result.
        policy_profile is one of: general, sales, support, legal-finance.
        """
        return _verdict(
            client.verify(recipient=recipient, subject=subject, body=body, policy_profile=policy_profile)
        )

    return FunctionTool.from_defaults(fn=qorami_check_email, name="qorami_check_email")
