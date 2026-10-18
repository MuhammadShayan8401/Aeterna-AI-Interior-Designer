"""
Times real generation on your deployed Space, so you know what users will experience.

  pip install gradio_client pillow
  export SPACE=your-username/your-space   EMAIL=you@example.com   PASSWORD=...
  python tools/bench.py            # 1 cold run + 2 warm runs, text-to-image and photo redesign

Prints seconds per design and a verdict. Uses your account's daily quota (about 6 designs).
"""
import os, sys, tempfile, time

from gradio_client import Client, handle_file
from PIL import Image

space, email, pw = os.getenv("SPACE"), os.getenv("EMAIL"), os.getenv("PASSWORD")
if not (space and email and pw):
    sys.exit("Set SPACE, EMAIL and PASSWORD (see the top of this file).")

c = Client(space, verbose=False)
info = c.predict(api_name="/ping")
print(f"Backend: device={info.get('device')} size={info.get('size')} steps={info.get('steps')} mock={info.get('mock')}")
tok = c.predict(email, pw, api_name="/auth_login")["access_token"]
photo = os.path.join(tempfile.mkdtemp(), "room.png"); Image.new("RGB", (640, 480), (170, 150, 130)).save(photo)

def timed(label, fn):
    t = time.time(); r = fn(); dt = time.time() - t
    if isinstance(r, dict) and r.get("error"):
        sys.exit(f"{label}: {r['error']}")
    print(f"{label:<28}{dt:6.1f}s  (server says {r.get('seconds')}s)"); return dt

scratch = lambda: c.predict(tok, "living room", "modern", "balanced", "natural", "neutral", "", 1, api_name="/from_scratch")
redo = lambda: c.predict(tok, handle_file(photo), "living room", "modern", "balanced", "neutral", "balanced", "", 1, api_name="/redesign")
cold = timed("first call (may be cold)", scratch)
warm = [timed("text-to-image (warm)", scratch), timed("photo redesign (warm)", redo)]
avg = sum(warm) / len(warm)
print(f"\nAverage warm time per design: {avg:.1f}s")
print("Verdict:", "great" if avg < 15 else "OK for a free tier" if avg < 60 else "slow - use a GPU/ZeroGPU Space or lower AETERNA_SIZE / AETERNA_STEPS")
