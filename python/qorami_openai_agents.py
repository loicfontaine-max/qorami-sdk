"""OpenAI Agents SDK tool wrapping Qorami so an agent checks an email before sending.

Requires: pip install openai-agents  (plus qorami.py from this folder)

Example:
    from agents import Agent
    from openai_agents_tool import qorami_check_email

    agent = Agent(
        name="Outreach agent",
        instructions="Always call qorami_check_email before sending an email, and obey the verdict.",
        tools=[qorami_check_email],
    )

Set QORAMI_API_KEY in the environment.
"""

import os

from qorami import QoramiClient

try:
    from agents import function_tool
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "This example needs openai-agents: pip install openai-agents"
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


@function_tool
def qorami_check_email(recipient: str, subject: str, body: str, policy_profile: str = "general") -> str:
    """Before sending any email, get permission from Qorami.

    Returns ALLOWED, NEEDS HUMAN APPROVAL, or BLOCKED. Always obey the result.
    policy_profile is one of: general, sales, support, legal-finance.
    """
    client = QoramiClient(api_key=os.environ["QORAMI_API_KEY"])
    return _verdict(
        client.verify(recipient=recipient, subject=subject, body=body, policy_profile=policy_profile)
    )
