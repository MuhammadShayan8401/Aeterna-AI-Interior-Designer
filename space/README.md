---
title: Aeterna AI Interior Designer
emoji: 🛋️
colorFrom: gray
colorTo: yellow
sdk: gradio
sdk_version: 6.30.0
app_file: app.py
pinned: false
license: mit
short_description: Backend API for the Aeterna interior design app.
---

# Aeterna backend (Gradio)

API for the Aeterna web app: user accounts, per-user history, and image generation.
The Space page itself is only a status note — generation needs an account.

| Endpoint | Purpose |
|---|---|
| `auth_register / auth_login / auth_refresh / auth_logout / auth_me` | accounts and sessions |
| `auth_change_password / auth_delete` | account management |
| `redesign / from_scratch` | generate designs (needs a token, counts against the daily quota) |
| `history_list / _get / _favorite / _rate / _delete / _clear` | per-user saved designs |

## Space secrets (Settings → Variables and secrets → *New secret*)
| Secret | What |
|---|---|
| `MONGODB_URI` | **Required on Hugging Face.** MongoDB Atlas connection string. Without it accounts live in a SQLite file that is wiped whenever the Space restarts. |
| `JWT_SECRET` | **Required.** Long random string: `python -c "import secrets;print(secrets.token_urlsafe(48))"`. Without it everyone is signed out on each restart. |

Optional variables: `DAILY_LIMIT` (designs per user per day, default 10), `ACCESS_TOKEN_MINUTES` (30),
`REFRESH_TOKEN_DAYS` (30), `DB_NAME` (aeterna), `AETERNA_SD_MODEL`, `AETERNA_LCM_LORA`, `AETERNA_SEG_MODEL`,
`AETERNA_SIZE` (512), `AETERNA_STEPS` (8), `AETERNA_GUIDANCE` (1.5), `AETERNA_MOCK=1` (placeholder images, no models).

### Email (verification + password reset)
Spaces block SMTP, so mail goes through an HTTPS API. Easiest: **Brevo** (free 300/day, no domain needed — just verify one sender address).
| Secret / variable | What |
|---|---|
| `BREVO_API_KEY` | Brevo → SMTP & API → API keys. (Or `RESEND_API_KEY` — Resend needs your own domain.) |
| `MAIL_FROM_EMAIL` | The sender address you verified in Brevo. |
| `MAIL_FROM_NAME` | Optional, default "Aeterna". |
| `APP_URL` | **Required for working links.** Where the frontend is hosted, e.g. `https://you.github.io/aeterna/`. |
| `REQUIRE_EMAIL_VERIFICATION` | `1`/`0`. Default: on only when a mail provider is configured. |
With no provider, emails are printed in the Space logs (handy for testing).

### Pro plan paid via Easypaisa (manual)
A personal Easypaisa wallet cannot be linked by API (that needs an Easypay merchant account). So users send the
amount to your wallet, then submit the transaction ID; you approve it.
| Variable | What |
|---|---|
| `EASYPAISA_NUMBER`, `EASYPAISA_NAME` | Wallet shown on the Pricing page. Defaults to Muhammad Shayan Ahmed / +923151032255; override with Space variables. The Terms page (`frontend/src/pages/Legal.jsx`) also names this account. |
| `PRO_PRICE_PKR` (500), `PRO_DAYS` (30), `PRO_DAILY_LIMIT` (50) | Plan settings. |
| `OWNER_EMAIL` | Gets an email for each new payment. |
| `OWNER_KEY` | **Secret, at least 24 random characters.** Protects owner endpoints. |
Approve payments from your computer:
```bash
pip install gradio_client
export SPACE=your-username/your-space-name OWNER_KEY=...
python tools/owner.py list pending
python tools/owner.py approve <id>      # or: reject <id> "reason"
```

### More options (all optional)
| Variable | What |
|---|---|
| `JAZZCASH_NUMBER`, `JAZZCASH_NAME`, `BANK_NAME`, `BANK_ACCOUNT`, `BANK_TITLE` | Extra payment methods shown on the Pricing page. |
| `REFERRAL_BONUS` (2), `REFERRAL_CAP` (10) | Extra daily designs for inviting friends. |
| `REMIND_DAYS` (3) | Email users this many days before Pro ends. |
| `TURNSTILE_SECRET` | Cloudflare Turnstile secret; also set `VITE_TURNSTILE_SITEKEY` in the frontend to turn on the sign-up CAPTCHA. |

Owner dashboard: open `https://your-frontend/#/owner` and enter `OWNER_KEY` to review payments (with screenshots), approve or reject.
Moderation: extra-instruction text is checked against a word list and images for size; there is no NSFW image model on the free CPU Space.

### Gateway, errors, speed
| Variable | What |
|---|---|
| `GATEWAY_CHECKOUT_URL`, `GATEWAY_SECRET`, `GATEWAY_NAME`, `GATEWAY_RETURN_URL` | Online payments through a merchant gateway (needs the relay in `tools/gateway-relay`). |
| `PRO_WEEK_PRICE_PKR`, `PRO_WEEK_DAYS` | Weekly plan price (0 = off) and length. |
| `AETERNA_CONTROLNET` | `canny` to lock the room layout (GPU recommended, untested on real models). |
| `SENTRY_DSN` | Optional backend error reporting. |
| `AETERNA_SIZE`, `AETERNA_STEPS`, `AETERNA_GUIDANCE` | Quality / speed trade-off. |

## Tests
`bash tests/run_all.sh` (unit tests + live API tests against a mock backend).

Never commit these values — and rotate the old Atlas password / JWT secret / admin key that were in `colab_runner_v2.ipynb`.

## Security notes
- Passwords: Argon2id. Access token: 30-minute signed JWT. Refresh token: random, stored only as a SHA-256 hash,
  single-use (rotated each refresh), revoked on logout / password change / account deletion.
- Login is rate-limited per email+IP; sign-ups per IP. Errors never reveal whether an email exists.
- Admin is not part of the app — manage users directly in MongoDB Atlas.
