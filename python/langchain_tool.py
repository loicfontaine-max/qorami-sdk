"""LangChain tool wrapping Qorami so an agent can check an email before sending.

Requires: pip install langchain-core  (plus qorami.py from this folder)

The tool returns the verdict (send / request_human_confirmation / do_not_send)
and a short reason, so the agent can decide whether to actually send.

Example:
    from langchain_tool import build_qorami_tool
    tool = build_qorami_tool(api_key=os.environ["QORAMI_API_KEY"])
    # add `tool` to your agent's tool list
"""

import os
from typing import Optional

from qorami import QoramiClient

try:
    from langchain_core.tools import StructuredTool
    from pydantic import BaseModel, Field
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "This example needs langchain-core and pydantic: pip install langchain-core pydantic"
    ) from exc


class _CheckEmailInput(BaseModel):
    recipient: str = Field(description="Recipient email address.")
    subject: str = Field(description="Email subject.")
    body: str = Field(description="Full email body.")
    policy_profile: str = Field(
        default="general",
        description="One of: general, sales, support, legal-finance.",
    )


def build_qorami_tool(api_key: Optional[str] = None, base_url: str = "https://qorami.fr") -> "StructuredTool":
    client = QoramiClient(api_key=api_key or os.environ["QORAMI_API_KEY"], base_url=base_url)

    def check_email_before_sending(recipient: str, subject: str, body: str, policy_profile: str = "general") -> str:
        result = client.verify(
            recipient=recipient, subject=subject, body=body, policy_profile=policy_profile
        )
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

    return StructuredTool.from_function(
        func=check_email_before_sending,
        name="qorami_check_email",
        description=(
            "Before sending any email, call this to get permission from Qorami. "
            "Returns ALLOWED, NEEDS HUMAN APPROVAL, or BLOCKED. Always obey the result."
        ),
        args_schema=_CheckEmailInput,
    )
