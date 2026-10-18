"""Live end-to-end API test through gradio_client. Needs a running mock server:  SPACE=http://127.0.0.1:7860 pytest tests/test_api.py
(tests/run_all.sh starts one for you)."""
import os, time, base64, io
import pytest
from PIL import Image

SPACE = os.getenv("SPACE")
OWNER_KEY = os.getenv("OWNER_KEY", "owner-key-owner-key-owner-key-1")
pytestmark = pytest.mark.skipif(not SPACE, reason="set SPACE to a running backend")

def _png(path, w=320, h=240):
    Image.new("RGB", (w, h), (150, 110, 80)).save(path); return path

@pytest.fixture(scope="module")
def c():
    from gradio_client import Client
    return Client(SPACE, verbose=False)

def call(c, name, *a):
    r = c.predict(*a, api_name="/" + name)
    return r

@pytest.fixture(scope="module")
def user(c):
    email = f"api{int(time.time()*1000)}@example.com"
    s = call(c, "auth_register", "Api Tester", email, "Str0ngPassw0rd!", "", "")
    return {"email": email, "tok": s["access_token"], "refresh": s["refresh_token"], "s": s}

def test_ping(c):
    r = call(c, "ping"); assert r["ok"] and r["mock"]

def test_budget_public(c):
    b = call(c, "budget_estimate", "bedroom", "japandi", "balanced")
    assert b["currency"] == "PKR" and b["total_high"] > b["total_low"] > 0

def test_register_has_referral_code(user):
    assert len(user["s"]["user"]["ref"]) == 8

def test_referral_signup(c, user):
    s2 = call(c, "auth_register", "Friend", f"fr{int(time.time()*1000)}@example.com", "Str0ngPassw0rd!", user["s"]["user"]["ref"], "")
    assert s2["user"]["bonus"] in (0, 2)

def test_moderation_blocks_prompt(c, user):
    r = call(c, "from_scratch", user["tok"], "living room", "modern", "balanced", "natural", "neutral", "NSFW stuff", 1)
    assert "can't use" in r["error"]

def test_generation_errors_are_returned_not_raised(c):
    r = call(c, "from_scratch", "not-a-token", "living room", "modern", "balanced", "natural", "neutral", "", 1)
    assert r["error"].startswith("AUTH_EXPIRED")

def test_flow_generate_variation_share(c, user, tmp_path):
    # verify email is enforced only when configured; the server in run_all.sh runs with verification OFF
    r = call(c, "from_scratch", user["tok"], "bedroom", "scandinavian", "balanced", "natural", "neutral", "", 1)
    assert len(r["images"]) == 1 and r["id"]
    v = call(c, "variation", user["tok"], r["id"], 0, "japandi", "earth", "more plants", "subtle", 1)
    assert v["settings"]["style"] == "japandi" and v["settings"]["variation_of"] == r["id"]
    sh = call(c, "share_create", user["tok"], v["id"], 0)
    pub = call(c, "share_get", sh["id"])
    assert pub["style"] == "japandi" and pub["image"].startswith("data:image") and "owner" not in pub
    assert len(call(c, "share_list", user["tok"])["items"]) == 1
    call(c, "share_delete", user["tok"], sh["id"])
    with pytest.raises(Exception): call(c, "share_get", sh["id"])

def test_payment_with_proof_and_owner(c, user, tmp_path):
    p = _png(tmp_path / "p.png"); b = base64.b64encode(open(p, "rb").read()).decode()
    r = call(c, "billing_submit", user["tok"], f"API{int(time.time())}", 500, "", "easypaisa", "data:image/png;base64," + b)
    pid = r["payment"]["id"]
    st = call(c, "owner_stats", OWNER_KEY); assert st["pending"] >= 1
    assert call(c, "owner_proof", OWNER_KEY, pid)["proof"].startswith("data:image/jpeg")
    with pytest.raises(Exception): call(c, "owner_stats", "bad-key")
    call(c, "owner_decide", OWNER_KEY, pid, True, "")
    me = call(c, "auth_me", user["tok"]); assert me["user"]["plan"]["name"] == "pro" and me["quota"]["limit"] >= 6


def test_region_redesign(c, user, tmp_path):
    from gradio_client import handle_file
    photo = _png(tmp_path / "p.png"); mk = tmp_path / "m.png"
    m = Image.new("L", (320, 240), 0); m.paste(255, (0, 0, 160, 240)); m.save(mk)
    r = call(c, "redesign_region", user["tok"], handle_file(str(photo)), handle_file(str(mk)),
             "living room", "modern", "balanced", "neutral", "balanced", "", 1)
    assert r.get("settings", {}).get("region") is True and len(r["images"]) == 1, r

def test_region_requires_paint(c, user, tmp_path):
    from gradio_client import handle_file
    photo = _png(tmp_path / "p2.png"); mk = tmp_path / "m2.png"; Image.new("L", (320, 240), 0).save(mk)
    r = call(c, "redesign_region", user["tok"], handle_file(str(photo)), handle_file(str(mk)),
             "living room", "modern", "balanced", "neutral", "balanced", "", 1)
    assert "too small" in r["error"]

def test_ping_reports_device(c):
    assert call(c, "ping")["device"] == "mock"
