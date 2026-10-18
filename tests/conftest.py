import os, sys, tempfile, pathlib
os.environ.update({
    "AETERNA_MOCK": "1", "JWT_SECRET": "test-secret-test-secret-test-secret-123", "DAILY_LIMIT": "3", "PRO_DAILY_LIMIT": "6",
    "REQUIRE_EMAIL_VERIFICATION": "1", "OWNER_KEY": "owner-key-owner-key-owner-key-1", "OWNER_EMAIL": "owner@example.com",
    "APP_URL": "http://app.test", "JAZZCASH_NUMBER": "03001112222", "REMIND_DAYS": "3",
})
os.environ.pop("BREVO_API_KEY", None); os.environ.pop("RESEND_API_KEY", None); os.environ.pop("TURNSTILE_SECRET", None)
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "space"))
import pytest

@pytest.fixture()
def db(tmp_path):
    from store import SqliteStore
    return SqliteStore(str(tmp_path / "t.db"))
