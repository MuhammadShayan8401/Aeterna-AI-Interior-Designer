# Aeterna AI Interior Designer — v3

```
space/      Gradio backend (accounts + history + generation) → Hugging Face Space (free)
frontend/   React app                                          → Vercel / Netlify / GitHub Pages
```

## 1 · Backend on Hugging Face
1. huggingface.co → **New Space** → SDK **Gradio** → **CPU basic (free)**.
2. Upload everything inside `space/` (not `aeterna.db`, if it exists).
3. In the Space **Settings → secrets** add `MONGODB_URI` and `JWT_SECRET`; for email and Easypaisa add the secrets listed in `space/README.md`. Set the frontend URL as `APP_URL`.
   Atlas → Network Access must allow `0.0.0.0/0` (Space IPs change).
4. First start downloads ~5 GB of weights (several minutes). Free CPU generates 2 images in roughly 1–3 min;
   a GPU / ZeroGPU Space is far faster with no code change.

## 2 · Frontend
```bash
cd frontend
cp .env.example .env        # VITE_SPACE=your-username/your-space-name
npm install
npm run dev                 # or: npm run build  → dist/ for any static host
```
Local backend: `cd space && pip install gradio torch diffusers transformers accelerate peft argon2-cffi PyJWT && python app.py`
→ `VITE_SPACE=http://localhost:7860`. `AETERNA_MOCK=1` skips model downloads (placeholder images); without
`MONGODB_URI` a local SQLite file is used.

## What users get
Register / sign in / sign out, protected Studio and History, account page (profile, daily usage, change password,
delete account), per-user history and style taste stored on the server. No admin screens.
Also included: email verification and password reset (Brevo/Resend), and a Pro plan paid manually via Easypaisa with an owner approval tool (`tools/owner.py`). Setup details are in `space/README.md`.

Also: download in HD, public share links, PKR budget estimates, printable mood board (Save as PDF), "More like this" variations,
referrals, an owner payment dashboard (`#/owner`), JazzCash/bank options with screenshot upload.

## Deploy extras
- Frontend: `frontend/vercel.json` works on Vercel; any static host works (hash routing). Set `VITE_SPACE`, optional `VITE_TURNSTILE_SITEKEY`, `VITE_PLAUSIBLE_DOMAIN`.
- Keep the free Space awake: push this repo to GitHub, add repository variable `SPACE_URL`; `.github/workflows/keep-alive.yml` pings it every 30 min.
- Tests: `bash tests/run_all.sh`.

## Speed, GPU and measuring it
1. Deploy, then run `python tools/bench.py` (see the top of the file) — it logs in and times real designs, then gives a verdict.
2. Slow on free CPU? Options: request a **ZeroGPU** or paid GPU Space (no code change; `@spaces.GPU` is already wired in),
   or keep CPU and lower `AETERNA_SIZE` (default 384 on CPU) / `AETERNA_STEPS` (default 8).
3. `GET /ping` (also the keep-alive) reports device, size, steps and the average seconds per design.

## Also included
- **Urdu / English** switch in the header (right-to-left layout, remembered per browser).
- **Change only part of a room**: tick "Only change part of the room", paint over the area; the rest of the photo is kept exactly.
- **Online payments** with a merchant account: see `tools/gateway-relay/README.md`.
- **Error reporting**: set `SENTRY_DSN` on the Space and `VITE_SENTRY_DSN` in the frontend (both optional, no personal data sent).

## Operating the product
- **Weekly plan** next to monthly: `PRO_WEEK_PRICE_PKR` (default 200, `0` turns it off) and `PRO_WEEK_DAYS` (7). Works with manual and online payments.
- **Evaluation report** for your project write-up: `python tools/report.py` (speed per image, likes by style, daily usage; writes `report.json` and `by_style.csv`).
- **Backups**: `python tools/backup.py` saves accounts, designs, payments and shares to a gzip file; `--restore file` loads it back. Keep it private.
- **Uptime alert**: the keep-alive workflow also checks `/ping`; if the Space is down GitHub emails you that the run failed.
- **Layout lock (optional)**: `AETERNA_CONTROLNET=canny` makes photo redesigns keep walls/windows/furniture positions. Needs a GPU; not tested on real models — compare with `tools/bench.py` and a few photos before enabling for everyone.
- **Funnel events** (sign-up, design created, payment started) go to Plausible when `VITE_PLAUSIBLE_DOMAIN` is set; no personal data.

## Admin and email troubleshooting
- Admin lives on the Space page, not the website: set `ADMIN_USERNAME` and `ADMIN_PASSWORD` (12+ chars) as Space secrets, open the Space URL, expand **Admin**, sign in. Nobody can register as admin.
- No emails arriving? In the admin panel the **Email status** box lists the exact problem (no `BREVO_API_KEY`, missing `MAIL_FROM_EMAIL`, sender not verified in Brevo, `APP_URL` not set) and **Send test email** shows the provider's real error. The same warnings are printed in the Space logs at startup.
