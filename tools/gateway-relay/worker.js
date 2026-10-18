// Gateway relay (Cloudflare Worker, free tier).
// The payment gateway (Easypay, JazzCash, PayFast …) sends its "payment result" request here. We read the order and result,
// sign them with GATEWAY_SECRET and tell your Hugging Face Space, which verifies the signature and switches Pro on.
//
// Variables to set on the Worker (Settings → Variables):
//   SPACE_URL       https://your-username-your-space.hf.space
//   GATEWAY_SECRET  the same 24+ character secret you set on the Space
//   ORDER_PARAM     name of the field holding our order id in the gateway's request      (default "order")
//   STATUS_PARAM    name of the field holding the result                                  (default "status")
//   AMOUNT_PARAM    name of the field holding the amount                                  (default "amount")
//   PAID_VALUES     comma-separated status values that mean success                       (default "paid,success,0000")
//   REDIRECT_URL    optional: where to send the user's browser afterwards (your site's #/pricing)
// Check your gateway's documentation for the real field names and, if it signs its own requests, add that check below.

async function hmacHex(secret, text) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const params = request.method === "POST" ? new URLSearchParams(await request.text()) : url.searchParams;
    const order = params.get(env.ORDER_PARAM || "order");
    const raw = params.get(env.STATUS_PARAM || "status") || "";
    const amount = String(Math.trunc(Number(params.get(env.AMOUNT_PARAM || "amount")) || 0));
    const paid = (env.PAID_VALUES || "paid,success,0000").split(",").map((s) => s.trim().toLowerCase()).includes(raw.toLowerCase());
    if (!order) return new Response("missing order", { status: 400 });

    const status = paid ? "paid" : "failed";
    const signature = await hmacHex(env.GATEWAY_SECRET, `${order}|${status}|${amount}`);

    // Gradio's HTTP API: POST to start the call, then GET the result stream.
    const base = `${env.SPACE_URL}/gradio_api/call/billing_gateway_callback`;
    const start = await fetch(base, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: [order, status, amount, signature] }) });
    if (!start.ok) return new Response("space unreachable", { status: 502 });
    const { event_id } = await start.json();
    const result = await (await fetch(`${base}/${event_id}`)).text();
    const ok = result.includes("event: complete");

    if (env.REDIRECT_URL && request.method === "GET") return Response.redirect(env.REDIRECT_URL, 302);
    return new Response(ok ? "OK" : "FAILED", { status: ok ? 200 : 500 });
  },
};
