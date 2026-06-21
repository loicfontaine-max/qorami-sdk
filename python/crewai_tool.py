"""CrewAI tool wrapping Qorami so an agent checks an email before sending.

Requires: pip install crewai pydantic  (plus qorami.py from this folder)

The tool returns the verdict (ALLOWED / NEEDS HUMAN APPROVAL / BLOCKED) so the
agent can decide whether to actually send.

Example:
    import os
    from crewai_tool import QoramiEmailGuard
    guard = QoramiEmailGuard(api_key=os.environ["QORAMI_API_KEY"])
    # add `guard` to your Crew/Agent tools
"""

import os
from typing import Optional, Type

from qorami import QoramiClient

try:
    from crewai.tools import BaseTool
    from pydantic import BaseModel, Field
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "This example needs crewai and pydantic: pip install crewai pydantic"
    ) from exc


class _CheckEmailInput(BaseModel):
    recipient: str = Field(description="Recipient email address.")
    subject: str = Field(description="Email subject.")
    body: str = Field(description="Full email body.")
    policy_profile: str = Field(
        default="general",
        description="One of: general, sales, support, legal-finance.",
    )


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


class QoramiEmailGuard(BaseTool):
    name: str = "qorami_check_email"
    description: str = (
        "Before sending any email, call this to get permission from Qorami. "
        "Returns ALLOWED, NEEDS HUMAN APPROVAL, or BLOCKED. Always obey the result."
    )
    args_schema: Type[BaseModel] = _CheckEmailInput
    # Stored as model fields (avoids pydantic private-attr pitfalls); the client
    # is built per call so the tool stays cheap to construct.
    api_key: Optional[str] = None
    base_url: str = "https://qorami.fr"

    def _run(self, recipient: str, subject: str, body: str, policy_profile: str = "general") -> str:
        client = QoramiClient(api_key=self.api_key or os.environ["QORAMI_API_KEY"], base_url=self.base_url)
        return _verdict(
            client.verify(recipient=recipient, subject=subject, body=body, policy_profile=policy_profile)
        )
