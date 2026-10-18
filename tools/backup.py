"""
Backs up accounts, designs, payments and shares to one gzip'd JSON-lines file.
Works with MongoDB Atlas (set MONGODB_URI) or the local SQLite file. Run it from your own computer.

  pip install pymongo[srv]           # only needed for MongoDB
  export MONGODB_URI="mongodb+srv://..."  DB_NAME=aeterna
  python tools/backup.py             # -> aeterna-backup-YYYYMMDD-HHMM.jsonl.gz

The file contains password hashes and personal data: keep it private and never commit it.
Restore: python tools/backup.py --restore aeterna-backup-....jsonl.gz   (skips documents that already exist)
"""
import gzip, json, os, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "space"))
from store import Duplicate, open_store

COLLS = ["users", "history", "payments", "payment_tx", "shares"]
db = open_store()

if len(sys.argv) == 3 and sys.argv[1] == "--restore":
    n = skipped = 0
    with gzip.open(sys.argv[2], "rt", encoding="utf-8") as f:
        for line in f:
            row = json.loads(line); doc = row["doc"]; _id = doc.pop("_id")
            try:
                db.insert(row["coll"], _id, doc); n += 1
            except Duplicate:
                skipped += 1
    sys.exit(print(f"Restored {n} documents, skipped {skipped} that already existed."))

out = f"aeterna-backup-{time.strftime('%Y%m%d-%H%M')}.jsonl.gz"
total = 0
with gzip.open(out, "wt", encoding="utf-8") as f:
    for c in COLLS:
        for d in db.all(c, None, limit=10**7):
            d = {k: (str(v) if k == "_id" else v) for k, v in d.items()}
            f.write(json.dumps({"coll": c, "doc": d}, default=str) + "\n"); total += 1
print(f"Saved {total} documents to {out}")
