"""Qorami Python client — zero dependency (standard library only).

Qorami is a control point between your AI agents and actually sending email.
The agent asks Qorami before each send and obeys the returned next action.

Usage:
    from qorami import QoramiClient
    qorami = QoramiClient(api_key=os.environ["QORAMI_API_KEY"])

    result = qorami.verify(
        recipient="client@example.com",
        subject="Our offer",
        body=email_body,
        policy_profile="sales",
    )
    if result.next_action_type == "send":
        send_email()
    elif result.next_action_type == "request_human_confirmation":
        queue_for_review(result.action_id)
    # else do_not_send: don't send
"""

import json
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Optional

DEFAULT_BASE_URL = "https://qorami.fr"


class QoramiError(Exception):
    def __init__(self, message, code=None, status=None, request_id=None):
        super().__init__(message)
        self.code = code
        self.status = status
        self.request_id = request_id


@dataclass
class VerifyResult:
    decision: Optional[str]
    next_action: Dict[str, Any]
    action: Dict[str, Any]
    billing: Dict[str, Any] = field(default_factory=dict)
    raw: Dict[str, Any] = field(default_factory=dict)

    @property
    def next_action_type(self) -> Optional[str]:
        return (self.next_action or {}).get("type")

    @property
    def action_id(self) -> Optional[str]:
        return (self.action or {}).get("id")


class QoramiClient:
    def __init__(self, api_key: str, base_url: str = DEFAULT_BASE_URL, timeout: float = 15.0):
        if not api_key:
            raise QoramiError("A Qorami API key is required.")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def _request(self, method: str, path: str, body: Optional[dict] = None) -> dict:
        data = json.dumps(body).encode("utf-8") if body is not None else None
        headers = {"x-qorami-api-key": self.api_key}
        if data is not None:
            headers["content-type"] = "application/json"
        req = urllib.request.Request(self.base_url + path, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read().decode("utf-8") or "{}")
        except urllib.error.HTTPError as exc:
            try:
                payload = json.loads(exc.read().decode("utf-8") or "{}")
            except Exception:
                payload = {}
            err = payload.get("error") or {}
            raise QoramiError(
                err.get("message") or f"Qorami request failed ({exc.code})",
                code=err.get("code"),
                status=exc.code,
                request_id=err.get("requestId"),
            ) from None

    def verify(self, recipient, subject, body, policy_profile="general",
               agent_id=None, idempotency_key=None) -> VerifyResult:
        """Verify an email before sending."""
        payload = {
            "recipient": recipient,
            "subject": subject,
            "body": body,
            "policyProfile": policy_profile,
        }
        if agent_id:
            payload["agentId"] = agent_id
        if idempotency_key:
            payload["idempotencyKey"] = idempotency_key
        data = self._request("POST", "/api/verify-email", payload)
        return VerifyResult(
            decision=(data.get("verification") or {}).get("decision"),
            next_action=data.get("nextAction") or {},
            action=data.get("action") or {},
            billing=data.get("billing") or {},
            raw=data,
        )

    def status(self, action_id: str) -> VerifyResult:
        """Poll one action's status after request_human_confirmation."""
        data = self._request("GET", f"/api/email-actions/{action_id}")
        return VerifyResult(
            decision=(data.get("action") or {}).get("decision"),
            next_action=data.get("nextAction") or {},
            action=data.get("action") or {},
            raw=data,
        )

    def guard(self, *, send: Callable = None, request_human_confirmation: Callable = None,
              do_not_send: Callable = None, **payload):
        """Verify, then dispatch to the handler matching the verdict."""
        result = self.verify(**payload)
        kind = result.next_action_type
        if kind == "send":
            return send(result) if send else result
        if kind == "request_human_confirmation":
            return request_human_confirmation(result) if request_human_confirmation else result
        return do_not_send(result) if do_not_send else result
