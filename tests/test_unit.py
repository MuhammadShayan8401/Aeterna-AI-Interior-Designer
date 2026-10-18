"""In-process tests of the server logic (no network, SQLite store, console mailer)."""
import base64, io, re, time
import pytest
from PIL import Image
import auth, billing, extras, mailer
from auth import AppError

IP = "1.2.3.4"
n = 0

def _mk(db, **kw):
    global n; n += 1
    email = kw.pop("email", f"user{n}{int(time.time()*1000)%100000}@example.com")
    s = auth.register(db, kw.pop("name", "Test User"), email, "Str0ngPassw0rd!", IP + str(n), **kw)
    return s, email

def _token(kind):
    return re.findall(r"#/%s\?token=([\w\-]+)" % kind, mailer.outbox[-1]["text"])[-1]

def _wait_mail(count_before):
    for _ in range(50):
        if len(mailer.outbox) > count_before: return
        time.sleep(0.05)

def _png(w=200, h=150):
    b = io.BytesIO(); Image.new("RGB", (w, h), (120, 80, 60)).save(b, "PNG")
    return "data:image/png;base64," + base64.b64encode(b.getvalue()).decode()

# ── moderation ───────────────────────────────────────────────────────────────
def test_moderation_text():
    assert extras.moderate_text("  a sunny corner with plants ") == "a sunny corner with plants"
    for bad in ("make it NSFW", "naked people", "bomb shelter gore"):
        with pytest.raises(AppError): extras.moderate_text(bad)
    assert len(extras.moderate_text("x" * 500)) == 200

def test_moderation_image():
    extras.check_image(Image.new("RGB", (400, 300)))
    with pytest.raises(AppError): extras.check_image(Image.new("RGB", (20, 20)))

def test_captcha_off_and_on(monkeypatch):
    extras.verify_captcha("", IP)                                    # off → no-op
    monkeypatch.setattr(extras, "TURNSTILE_SECRET", "x")
    with pytest.raises(AppError): extras.verify_captcha("", IP)       # missing token
    monkeypatch.setattr(extras.urllib.request, "urlopen", lambda *a, **k: (_ for _ in ()).throw(OSError("down")))
    with pytest.raises(AppError): extras.verify_captcha("tok", IP)    # network failure → fail closed
    class R:
        def __init__(s, ok): s.ok = ok
        def read(s): return b'{"success": %s}' % (b"true" if s.ok else b"false")
        def __enter__(s): return s
        def __exit__(s, *a): pass
    monkeypatch.setattr(extras.urllib.request, "urlopen", lambda *a, **k: R(True)); extras.verify_captcha("tok", IP)
    monkeypatch.setattr(extras.urllib.request, "urlopen", lambda *a, **k: R(False))
    with pytest.raises(AppError): extras.verify_captcha("tok", IP)

# ── budget ───────────────────────────────────────────────────────────────────
def test_budget():
    b = extras.budget("living room", "modern", "balanced")
    assert b["currency"] == "PKR" and b["total_low"] < b["total_high"] and len(b["items"]) >= 6
    assert b["total_low"] == sum(i["low"] for i in b["items"])
    lux = extras.budget("living room", "luxury", "full")["total_high"]
    mini = extras.budget("living room", "minimalist", "minimal")["total_high"]
    assert lux > b["total_high"] > mini
    for room in extras.ITEMS: assert extras.budget(room, "modern", "balanced")["total_low"] > 0
    assert extras.budget("???", "???", "???")["total_low"] > 0        # unknown values fall back

# ── referrals ────────────────────────────────────────────────────────────────
def test_referral_flow(db):
    a, a_email = _mk(db); code = a["user"]["ref"]; assert len(code) == 8
    before = len(mailer.outbox)
    b, _ = _mk(db, ref=code); _wait_mail(before)
    assert db.get("users", a["user"]["id"]).get("referrals", 0) == 0        # not credited until verified
    auth.verify_email(db, _token("verify"))
    ua = db.get("users", a["user"]["id"]); ub = db.get("users", b["user"]["id"])
    assert ua["referrals"] == 1 and ub["ref_credited"] is True
    assert auth.limit_for(ua) == 3 + 2 and auth.limit_for(ub) == 3 + 2
    auth.verify_email  # idempotent credit: crediting twice must not double count
    auth._credit_referral(db, db.get("users", b["user"]["id"]))
    assert db.get("users", a["user"]["id"])["referrals"] == 1

def test_referral_cap_and_self(db):
    a, _ = _mk(db)
    db.update("users", a["user"]["id"], {"referrals": 99})
    assert auth.limit_for(db.get("users", a["user"]["id"])) == 3 + auth.REF_CAP
    assert not _mk(db, ref="zzzzzzzz")[0]["user"].get("bonus")         # unknown code is ignored

# ── share links ──────────────────────────────────────────────────────────────
def _item(db, uid):
    iid = "it1"
    db.insert("history", iid, {"owner": uid, "created": time.time(), "mode": "photo", "before": _png(),
                               "images": [_png(), _png()], "aspect": "4 / 3",
                               "settings": {"style": "modern", "room_type": "bedroom", "density": "balanced"}})
    return db.get("history", iid)

def test_share_lifecycle(db):
    s, _ = _mk(db); u = db.get("users", s["user"]["id"]); item = _item(db, u["_id"])
    sid = extras.share_create(db, u, item, 1)["id"]
    pub = extras.share_get(db, sid)
    assert pub["style"] == "modern" and pub["image"].startswith("data:image") and "owner" not in pub and pub["by"] == "Test"
    with pytest.raises(AppError): extras.share_create(db, u, item, 9)
    assert len(extras.share_list(db, u)["items"]) == 1
    other, _ = _mk(db); ou = db.get("users", other["user"]["id"])
    with pytest.raises(AppError): extras.share_delete(db, ou, sid)       # only the owner can revoke
    extras.share_delete(db, u, sid)
    with pytest.raises(AppError): extras.share_get(db, sid)
    with pytest.raises(AppError): extras.share_get(db, "nope")

# ── payments ─────────────────────────────────────────────────────────────────
def test_methods_and_proof(db):
    ids = [m["id"] for m in billing.methods()]
    assert ids[0] == "easypaisa" and "jazzcash" in ids
    assert billing.methods()[0]["number"] == "+923151032255"
    s, _ = _mk(db); u = db.get("users", s["user"]["id"])
    r = billing.submit(db, u, "jz12345678", 500, "", "jazzcash", _png(1500, 3000))
    pid = r["payment"]["id"]; assert r["payment"]["method"] == "jazzcash"
    proof = billing.owner_proof(db, billing.OWNER_KEY, IP, pid)["proof"]
    img = Image.open(io.BytesIO(base64.b64decode(proof.split(",")[1])))
    assert max(img.size) <= 1600 and img.size[0] <= 900                  # shrunk
    assert billing.owner_list(db, billing.OWNER_KEY, IP, "pending")["payments"][0]["has_proof"] is True
    with pytest.raises(AppError): billing.submit(db, u, "jz22345678", 500, "", "easypaisa", "data:image/png;base64,AAAA")
    with pytest.raises(AppError): billing.owner_proof(db, "wrong-key", IP, pid)

def test_unknown_method_falls_back(db):
    s, _ = _mk(db); u = db.get("users", s["user"]["id"])
    assert billing.submit(db, u, "ZZ98765432", 600, "", "bitcoin")["payment"]["method"] == "easypaisa"

def test_owner_stats_and_approval(db):
    s, _ = _mk(db); u = db.get("users", s["user"]["id"])
    pid = billing.submit(db, u, "STAT123456", 500)["payment"]["id"]
    assert billing.owner_stats(db, billing.OWNER_KEY, IP)["pending"] >= 1
    billing.owner_decide(db, billing.OWNER_KEY, IP, pid, True, "")
    st = billing.owner_stats(db, billing.OWNER_KEY, IP)
    assert st["pro_active"] >= 1 and st["revenue_pkr"] >= 500
    assert auth.limit_for(db.get("users", u["_id"])) == 6
    with pytest.raises(AppError): billing.owner_stats(db, "", IP)

# ── expiry reminders ─────────────────────────────────────────────────────────
def test_expiry_reminders(db):
    s, email = _mk(db); uid = s["user"]["id"]
    now = time.time()
    db.update("users", uid, {"plan": {"name": "pro", "until": now + 2 * 86400}})
    assert extras.send_expiry_reminders(db, now) == 1
    assert extras.send_expiry_reminders(db, now) == 0                      # only once per period
    db.update("users", uid, {"plan": {"name": "pro", "until": now + 30 * 86400}})
    assert extras.send_expiry_reminders(db, now) == 0                      # not near expiry
    db.update("users", uid, {"plan": {"name": "pro", "until": now - 100}})
    assert extras.send_expiry_reminders(db, now) == 0                      # already expired
    _wait_mail(0)
    assert any("ends soon" in m["subject"] and m["to"] == email for m in mailer.outbox)


# ── region editing + stats ───────────────────────────────────────────────────
def test_composite_keeps_original_outside_mask():
    import engine
    orig = Image.new("RGB", (64, 64), (255, 0, 0)); gen = Image.new("RGB", (64, 64), (0, 0, 255))
    mask = Image.new("L", (64, 64), 0); mask.paste(255, (32, 0, 64, 64))        # right half painted
    out = engine.composite(orig, gen, mask, feather=0)
    assert out.getpixel((4, 32)) == (255, 0, 0) and out.getpixel((60, 32)) == (0, 0, 255)

def test_mask_coverage():
    import engine
    assert engine.mask_coverage(Image.new("L", (100, 100), 0)) == 0
    assert engine.mask_coverage(Image.new("L", (100, 100), 255)) == 1

def test_engine_stats_shape():
    import engine
    engine.record_time(2.0); engine.record_time(4.0)
    s = engine.stats()
    assert s["avg_seconds"] == 3.0 and s["device"] == "mock"


# ── online gateway ────────────────────────────────────────────────────────────
@pytest.fixture
def gw(monkeypatch):
    monkeypatch.setattr(billing, "GATEWAY_URL", "https://pay.example/c?o={order}&a={amount}&e={email}&s={sig}&b={back}")
    monkeypatch.setattr(billing, "GATEWAY_SECRET", "g" * 32)
    monkeypatch.setattr(billing, "gateway_limit", billing._Limiter(30, 900))

def test_gateway_flow(db, gw):
    s, _ = _mk(db); u = db.get("users", s["user"]["id"])
    r = billing.pay_start(db, u)
    assert r["url"].startswith("https://pay.example/c?o=" + r["order"]) and billing.info(db, u)["gateway"]["enabled"]
    sig = billing._gsign(r["order"], "paid", 500)
    assert billing.gateway_callback(db, r["order"], "paid", "500", sig, IP)["status"] == "approved"
    assert auth.profile(db, db.get("users", u["_id"]))["user"]["plan"]["active"]
    assert billing.gateway_callback(db, r["order"], "paid", "500", sig, IP)["status"] == "approved"      # retry is harmless
    assert db.get("payments", r["order"])["decision_note"] == "paid online"

def test_gateway_rejects_bad_calls(db, gw):
    s, _ = _mk(db); u = db.get("users", s["user"]["id"])
    o = billing.pay_start(db, u)["order"]
    with pytest.raises(AppError): billing.gateway_callback(db, o, "paid", "500", "0" * 64, IP)                  # bad signature
    with pytest.raises(AppError): billing.gateway_callback(db, o, "paid", "999", billing._gsign(o, "paid", 500), IP)  # signature doesn't cover this amount
    assert billing.gateway_callback(db, o, "paid", "100", billing._gsign(o, "paid", 100), IP)["status"] == "rejected"   # too little
    assert not auth.profile(db, db.get("users", u["_id"]))["user"]["plan"]["active"]
    o2 = billing.pay_start(db, u)["order"]
    assert billing.gateway_callback(db, o2, "failed", "0", billing._gsign(o2, "failed", 0), IP)["status"] == "rejected"

def test_gateway_off_by_default(db):
    s, _ = _mk(db); u = db.get("users", s["user"]["id"])
    with pytest.raises(AppError): billing.pay_start(db, u)
    assert billing.info(db, u)["gateway"]["enabled"] is False


# ── weekly plan ───────────────────────────────────────────────────────────────
def test_plan_options_and_week_purchase(db, monkeypatch):
    monkeypatch.setattr(billing, "WEEK_PRICE", 200)
    assert billing.plan_options()["week"] == {"price": 200, "days": billing.WEEK_DAYS}
    s, _ = _mk(db); u = db.get("users", s["user"]["id"])
    with pytest.raises(AppError): billing.submit(db, u, "WK10000001", 150, "", "easypaisa", "", "week")     # below weekly price
    pid = billing.submit(db, u, "WK10000002", 200, "", "easypaisa", "", "week")["payment"]["id"]
    billing.owner_decide(db, billing.OWNER_KEY, IP, pid, True, "")
    until = db.get("users", u["_id"])["plan"]["until"]
    assert 6.9 * 86400 < until - time.time() < 7.1 * 86400                                                      # 7 days, not 30

def test_weekly_off_and_gateway_week(db, gw, monkeypatch):
    s, _ = _mk(db); u = db.get("users", s["user"]["id"])
    r = billing.pay_start(db, u, "week"); assert db.get("payments", r["order"])["amount"] == billing.plan_options()["week"]["price"]
    p = billing.plan_options()["week"]["price"]
    billing.gateway_callback(db, r["order"], "paid", str(p), billing._gsign(r["order"], "paid", p), IP)
    assert db.get("users", u["_id"])["plan"]["until"] - time.time() < 8 * 86400
    monkeypatch.setattr(billing, "WEEK_PRICE", 0)
    assert "week" not in billing.plan_options() and billing._plan("week")[0] == "month"


# ── report + backup ───────────────────────────────────────────────────────────
def test_report_aggregates(db):
    s, _ = _mk(db); uid = s["user"]["id"]
    db.insert("history", "h-rep-1", {"owner": uid, "created": time.time(), "mode": "photo", "settings": {"style": "japandi"},
                                     "seconds": 20.0, "count": 2, "ratings": [1, -1], "favorite": True, "images": ["x"] * 2})
    db.insert("history", "h-rep-2", {"owner": uid, "created": time.time(), "mode": "scratch", "settings": {"style": "japandi"},
                                     "seconds": 10.0, "count": 1, "ratings": [1], "favorite": False, "images": ["x"]})
    r = extras.report(db)
    j = r["by_style"]["japandi"]
    assert j["designs"] == 2 and j["images"] == 3 and j["likes"] == 2 and j["dislikes"] == 1 and j["like_rate"] == 0.67
    assert r["users"] >= 1 and r["seconds_per_image"]["mean"] is not None and "data:image" not in str(r)
    with pytest.raises(AppError): billing.owner_report(db, "wrong-key", IP)
    assert billing.owner_report(db, billing.OWNER_KEY, IP)["design_sessions"] >= 2

def test_backup_and_restore_roundtrip(db, tmp_path):
    import subprocess, sys, os
    s, email = _mk(db)
    env = dict(os.environ, AETERNA_DB=db.path if hasattr(db, "path") else os.environ.get("AETERNA_DB", ""))
    # the backup script opens the store from env, so point it at the same sqlite file
    if not env["AETERNA_DB"]: pytest.skip("store is not sqlite")
    r = subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), "..", "tools", "backup.py")], cwd=tmp_path, env=env, capture_output=True, text=True)
    assert "Saved" in r.stdout, r.stderr
    f = next(tmp_path.glob("aeterna-backup-*.jsonl.gz"))
    r2 = subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), "..", "tools", "backup.py"), "--restore", str(f)], cwd=tmp_path, env=env, capture_output=True, text=True)
    assert "skipped" in r2.stdout and "Restored 0" in r2.stdout, r2.stdout + r2.stderr


def test_edge_map_shape_and_content():
    import engine
    im = Image.new("RGB", (160, 120), (20, 20, 20))
    for x in range(80, 160):
        for y in range(120): im.putpixel((x, y), (230, 230, 230))
    e = engine.edge_map(im)
    assert e.size == im.size and e.mode == "RGB"
    px = e.convert("L")
    assert px.getpixel((80, 60)) == 255 and px.getpixel((10, 60)) == 0          # edge on the boundary, none in flat areas
    assert engine.stats()["layout_lock"] is False


# ── admin role + mail diagnostics ─────────────────────────────────────────────
@pytest.fixture
def adm(monkeypatch):
    monkeypatch.setattr(billing, "ADMIN_USER", "boss")
    monkeypatch.setattr(billing, "ADMIN_PASSWORD", "correct-horse-battery")
    monkeypatch.setattr(billing, "admin_limit", billing._Limiter(5, 900))

def test_admin_login_from_backend_secrets(db, adm):
    tok = billing.admin_login("boss", "correct-horse-battery", IP)
    assert tok.startswith("adm.") and billing.admin_session_ok(tok)
    assert billing.owner_stats(db, tok, IP)["users"] >= 0                       # the session opens the owner tools
    assert billing.owner_mail_status(db, tok, IP)["provider"] == mailer.provider

def test_admin_login_rejects_wrong_credentials_and_locks_out(db, adm):
    for u, p in (("boss", "wrong-password-123"), ("root", "correct-horse-battery"), ("", "")):
        with pytest.raises(AppError): billing.admin_login(u, p, IP)
    for _ in range(3):
        with pytest.raises(AppError): billing.admin_login("boss", "nope-nope-nope-1", IP)
    with pytest.raises(AppError) as e: billing.admin_login("boss", "correct-horse-battery", IP)   # locked out even with the right password
    assert "Too many" in str(e.value)

def test_admin_disabled_without_strong_password(db, monkeypatch):
    monkeypatch.setattr(billing, "ADMIN_USER", "boss"); monkeypatch.setattr(billing, "ADMIN_PASSWORD", "short")
    with pytest.raises(AppError): billing.admin_login("boss", "short", IP)
    monkeypatch.setattr(billing, "ADMIN_USER", ""); monkeypatch.setattr(billing, "ADMIN_PASSWORD", "")
    with pytest.raises(AppError): billing.admin_login("", "", IP)

def test_admin_session_forgery_expiry_and_password_change(db, adm, monkeypatch):
    tok = billing.admin_login("boss", "correct-horse-battery", IP)
    _, exp, sig = tok.split(".")
    assert not billing.admin_session_ok(f"adm.{int(exp) + 999}.{sig}")                # extended expiry
    assert not billing.admin_session_ok(f"adm.{exp}.{'0' * 64}") and not billing.admin_session_ok("adm.1.2") and not billing.admin_session_ok("")
    with pytest.raises(AppError): billing.owner_stats(db, f"adm.{exp}.{'0' * 64}", IP)
    monkeypatch.setattr(billing.time, "time", lambda: int(exp) + 5)                      # after the 30 minutes
    assert not billing.admin_session_ok(tok)
    monkeypatch.undo()
    monkeypatch.setattr(billing, "ADMIN_USER", "boss"); monkeypatch.setattr(billing, "ADMIN_PASSWORD", "a-different-password-9")
    assert not billing.admin_session_ok(tok)                                          # changing the secret signs the admin out

def test_no_user_can_become_admin(db, adm):
    s, email = _mk(db, email="boss@example.com", name="boss")                         # same name/email as the admin: no effect
    assert "admin" not in s["user"]
    with pytest.raises(AppError): billing.owner_stats(db, s["access_token"], IP)     # a normal login token never opens owner tools

def test_owner_key_still_works_and_bad_token_rejected(db):
    assert billing.owner_stats(db, billing.OWNER_KEY, IP)["users"] >= 0
    with pytest.raises(AppError): billing.owner_stats(db, "aaa.bbb." + "c" * 80, IP)

def test_mail_diagnose_and_failure_reporting(monkeypatch):
    import urllib.error
    monkeypatch.setattr(mailer, "provider", "console")
    assert any("No mail provider" in p for p in mailer.diagnose())
    r = mailer.send_test("someone@example.com"); assert r["ok"] is False and "No mail provider" in r["error"]
    monkeypatch.setattr(mailer, "provider", "brevo"); monkeypatch.setattr(mailer, "FROM_EMAIL", "")
    assert any("MAIL_FROM_EMAIL" in p for p in mailer.diagnose())
    monkeypatch.setattr(mailer, "FROM_EMAIL", "me@example.com"); monkeypatch.setattr(mailer, "BREVO_KEY", "k")
    def boom(*a, **k):
        raise urllib.error.HTTPError("u", 400, "bad", {}, io.BytesIO(b'{"message":"Sender not valid"}'))
    monkeypatch.setattr(mailer.urllib.request, "urlopen", boom)
    r = mailer.send_test("someone@example.com")
    assert r["ok"] is False and "400" in r["error"] and "Sender not valid" in r["error"]
    assert mailer.health()["failed"] >= 1 and "Sender not valid" in mailer.health()["last_error"]
    class Ok:
        def read(self): return b"{}"
        def __enter__(self): return self
        def __exit__(self, *a): return False
    monkeypatch.setattr(mailer.urllib.request, "urlopen", lambda *a, **k: Ok())
    assert mailer.send_test("someone@example.com")["ok"] is True and mailer.health()["last_error"] == ""
