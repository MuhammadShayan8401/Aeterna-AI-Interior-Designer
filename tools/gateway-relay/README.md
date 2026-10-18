# Online payments with an Easypay (or other) merchant account

A personal Easypaisa wallet cannot take automatic payments. A **merchant account** can. Once you have one:

1. **Space variables**
   - `GATEWAY_CHECKOUT_URL` — the gateway's checkout link as a template. Placeholders: `{order}`, `{amount}`, `{email}`, `{sig}`, `{back}`.
     Copy the exact parameter names from your gateway's integration guide, e.g.
     `https://your-gateway/checkout?storeId=123&orderRefNum={order}&amount={amount}&postBackURL=https://your-worker.workers.dev/&autoRedirect=1`
   - `GATEWAY_SECRET` — 24+ random characters (`python -c "import secrets;print(secrets.token_urlsafe(32))"`).
   - `GATEWAY_NAME` — label on the button (default "Easypay"). `GATEWAY_RETURN_URL` — your site, for `{back}`.
2. **Relay** — deploy `worker.js` as a Cloudflare Worker (free). Set `SPACE_URL`, `GATEWAY_SECRET` and the field names your gateway uses.
   Point the gateway's "post-back / notification URL" at the Worker.
3. The Pricing page now shows **Pay PKR 500 online**. When the gateway reports success, the relay signs the result and the Space verifies
   the signature, activates Pro and emails the user. Callbacks are idempotent, amounts are checked, and wrong signatures are rate-limited.

Manual transfers keep working next to this. Nothing here has been tested against a live gateway — use the gateway's sandbox first.
