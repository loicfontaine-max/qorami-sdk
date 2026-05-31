"""Qorami quickstart (Python 3.9+). The full guard loop an agent runs before
sending an email: verify -> send / wait-for-human / block, with polling for the
human decision after a review.

Run:  QORAMI_API_KEY=qrm_ws_... python examples/python-quickstart.py

Uses the zero-dependency client from ../sdk/python/qorami.py.
"""

import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "sdk", "python"))
from qorami import QoramiClient  # noqa: E402

api_key = os.environ.get("QORAMI_API_KEY")
if not api_key:
    sys.exit("Set QORAMI_API_KEY (get one at https://qorami.fr/dashboard/).")

qorami = QoramiClient(api_key=api_key)

email = dict(
    recipient="client@example.com",
    subject="Suivi de notre échange",
    body="Bonjour, merci pour votre temps. Je reviens vers vous avec les prochaines étapes.",
    policy_profile="sales",
)


def actually_send_email():
    print("📤 sending the email via your mailer...")


def wait_for_human_decision(action_id, tries=20, interval_s=5):
    for _ in range(tries):
        res = qorami.status(action_id)
        if res.next_action_type == "send":
            return "approved"
        if res.next_action_type == "do_not_send":
            return "blocked"
        print(f"⏳ still {res.action.get('status')} — waiting for human approval...")
        time.sleep(interval_s)
    return "timeout"


result = qorami.verify(**email)
print(f"Qorami says: {result.next_action_type} (decision: {result.decision})")

if result.next_action_type == "send":
    actually_send_email()
elif result.next_action_type == "request_human_confirmation":
    print(f"🙋 needs human approval — action {result.action_id}. The owner was notified by email.")
    outcome = wait_for_human_decision(result.action_id)
    if outcome == "approved":
        actually_send_email()
    else:
        print(f"🚫 not sending ({outcome}).")
else:
    print(f"⛔ blocked — not sending. Reason: {(result.next_action or {}).get('reason')}")
