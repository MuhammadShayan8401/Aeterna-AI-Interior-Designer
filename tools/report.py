"""
Evaluation report for the project write-up: speed, ratings per style, daily usage.

  pip install gradio_client
  export SPACE=your-username/your-space  OWNER_KEY=...
  python tools/report.py              # prints Markdown tables; also writes report.json and by_style.csv
"""
import csv, json, os, sys
from gradio_client import Client

space, key = os.getenv("SPACE"), os.getenv("OWNER_KEY")
if not (space and key):
    sys.exit("Set SPACE and OWNER_KEY.")
r = Client(space, verbose=False).predict(key, api_name="/owner_report")
json.dump(r, open("report.json", "w"), indent=2)

print(f"Users: {r['users']} ({r['new_users_7d']} new in 7 days) · design sessions: {r['design_sessions']} · images: {r['images']}")
s = r["seconds_per_image"]; print(f"Seconds per image — mean {s['mean']}, median {s['median']}, p90 {s['p90']}\n")
cols = ["designs", "images", "likes", "dislikes", "like_rate", "favorites", "avg_seconds_per_image"]
print("| style | " + " | ".join(cols) + " |\n|" + "---|" * (len(cols) + 1))
for k, v in r["by_style"].items():
    print(f"| {k} | " + " | ".join(str(v[c]) for c in cols) + " |")
with open("by_style.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow(["style"] + cols)
    for k, v in r["by_style"].items(): w.writerow([k] + [v[c] for c in cols])
print("\nImages per day:", r["daily_images"])
print("\nWrote report.json and by_style.csv")
