#!/usr/bin/env python3
"""
Owner tool: review Easypaisa payments and switch Pro on.

  pip install gradio_client
  export SPACE=your-username/your-space-name        # or http://localhost:7860
  export OWNER_KEY=...                              # the OWNER_KEY secret of your Space

  python tools/owner.py list                        # payments waiting for review (also: approved | rejected | all)
  python tools/owner.py approve <payment_id>        # after you confirmed the money in your Easypaisa app
  python tools/owner.py reject  <payment_id> "TID not found"
"""
import os
import sys

from gradio_client import Client


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] not in ("list", "approve", "reject"):
        sys.exit(__doc__)
    space, key = os.getenv("SPACE"), os.getenv("OWNER_KEY")
    if not space or not key:
        sys.exit("Set SPACE and OWNER_KEY environment variables first.")
    c = Client(space, verbose=False)
    cmd = sys.argv[1]
    if cmd == "list":
        status = sys.argv[2] if len(sys.argv) > 2 else "pending"
        rows = c.predict(key, status, api_name="/owner_payments")["payments"]
        if not rows:
            print(f"No {status} payments.")
        for p in rows:
            print(f"{p['id']}  PKR {p['amount']}  TID {p['tx_id']}  {p['name']} <{p['email']}>  "
                  f"from {p['sender'] or '-'}  ref {p['reference']}  [{p['status']}]")
    else:
        if len(sys.argv) < 3:
            sys.exit("Give the payment id.")
        note = sys.argv[3] if len(sys.argv) > 3 else ""
        print(c.predict(key, sys.argv[2], cmd == "approve", note, api_name="/owner_decide"))


if __name__ == "__main__":
    main()
