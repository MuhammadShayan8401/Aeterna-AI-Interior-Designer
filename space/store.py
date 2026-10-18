"""
Tiny document store with two interchangeable backends.

  MONGODB_URI set  -> MongoDB Atlas (use this on Hugging Face: the Space's own disk is wiped on restart)
  otherwise        -> SQLite file  (local development only)

Every document has: _id, owner (user id), created (epoch seconds).
Collections used: users, refresh, history, usage.
"""
from __future__ import annotations

import json
import os
import sqlite3
import threading
import time


class Duplicate(Exception):
    pass


# ── MongoDB ───────────────────────────────────────────────────────────────────
class MongoStore:
    kind = "mongodb"

    def __init__(self, uri: str, db: str):
        from pymongo import ASCENDING, MongoClient
        from pymongo.errors import DuplicateKeyError
        self._dup = DuplicateKeyError
        self.db = MongoClient(uri, serverSelectionTimeoutMS=8000, tz_aware=True)[db]
        self.db.command("ping")
        for c in ("history", "refresh"):
            self.db[c].create_index([("owner", ASCENDING), ("created", -1)])
        self.db["refresh"].create_index("exp_dt", expireAfterSeconds=0)   # auto-delete expired tokens
        self.db["etokens"].create_index("exp_dt", expireAfterSeconds=0)   # email verify / reset tokens

    def insert(self, coll, _id, doc):
        try:
            self.db[coll].insert_one({**doc, "_id": _id})
        except self._dup:
            raise Duplicate(_id)

    def get(self, coll, _id):
        return self.db[coll].find_one({"_id": _id})

    def update(self, coll, _id, fields):
        self.db[coll].update_one({"_id": _id}, {"$set": fields})

    def delete(self, coll, _id):
        self.db[coll].delete_one({"_id": _id})

    def pop(self, coll, _id):
        return self.db[coll].find_one_and_delete({"_id": _id})

    def list(self, coll, owner, limit=100, projection=None):
        cur = self.db[coll].find({"owner": owner}, projection).sort("created", -1).limit(limit)
        return list(cur)

    def delete_owned(self, coll, owner):
        self.db[coll].delete_many({"owner": owner})

    def all(self, coll, where=None, limit=200, projection=None):
        return list(self.db[coll].find(where or {}, projection).sort("created", -1).limit(limit))

    def consume(self, uid, day, limit) -> int | None:
        """Atomically use one unit of today's quota. Returns the new count, or None if exhausted."""
        _id = f"{uid}:{day}"
        try:
            self.db["usage"].update_one({"_id": _id}, {"$setOnInsert": {"owner": uid, "created": time.time(), "count": 0}}, upsert=True)
        except self._dup:
            pass
        r = self.db["usage"].find_one_and_update({"_id": _id, "count": {"$lt": limit}}, {"$inc": {"count": 1}}, return_document=True)
        return r["count"] if r else None

    def refund(self, uid, day):
        self.db["usage"].update_one({"_id": f"{uid}:{day}", "count": {"$gt": 0}}, {"$inc": {"count": -1}})

    def used(self, uid, day) -> int:
        r = self.db["usage"].find_one({"_id": f"{uid}:{day}"})
        return r["count"] if r else 0


# ── SQLite ────────────────────────────────────────────────────────────────────
class SqliteStore:
    kind = "sqlite"

    def __init__(self, path: str):
        self.lock = threading.RLock()
        self.path = path
        self.c = sqlite3.connect(path, check_same_thread=False)
        self.c.execute("""CREATE TABLE IF NOT EXISTS docs(
            coll TEXT, id TEXT, owner TEXT, created REAL, doc TEXT, PRIMARY KEY(coll, id))""")
        self.c.execute("CREATE INDEX IF NOT EXISTS ix_owner ON docs(coll, owner, created)")
        self.c.commit()

    @staticmethod
    def _load(row):
        if not row:
            return None
        d = json.loads(row[0])
        return d

    def insert(self, coll, _id, doc):
        with self.lock:
            try:
                self.c.execute("INSERT INTO docs VALUES(?,?,?,?,?)",
                               (coll, _id, doc.get("owner"), doc.get("created", time.time()), json.dumps({**doc, "_id": _id})))
                self.c.commit()
            except sqlite3.IntegrityError:
                raise Duplicate(_id)

    def get(self, coll, _id):
        with self.lock:
            return self._load(self.c.execute("SELECT doc FROM docs WHERE coll=? AND id=?", (coll, _id)).fetchone())

    def update(self, coll, _id, fields):
        with self.lock:
            d = self.get(coll, _id)
            if d is not None:
                d.update(fields)
                self.c.execute("UPDATE docs SET doc=? WHERE coll=? AND id=?", (json.dumps(d), coll, _id))
                self.c.commit()

    def delete(self, coll, _id):
        with self.lock:
            self.c.execute("DELETE FROM docs WHERE coll=? AND id=?", (coll, _id)); self.c.commit()

    def pop(self, coll, _id):
        with self.lock:
            d = self.get(coll, _id)
            if d is not None:
                self.delete(coll, _id)
            return d

    def list(self, coll, owner, limit=100, projection=None):
        with self.lock:
            rows = self.c.execute("SELECT doc FROM docs WHERE coll=? AND owner=? ORDER BY created DESC LIMIT ?",
                                  (coll, owner, limit)).fetchall()
        out = [json.loads(r[0]) for r in rows]
        if projection:
            keep = {k for k, v in projection.items() if v} | {"_id"}
            out = [{k: v for k, v in d.items() if k in keep} for d in out]
        return out

    def delete_owned(self, coll, owner):
        with self.lock:
            self.c.execute("DELETE FROM docs WHERE coll=? AND owner=?", (coll, owner)); self.c.commit()

    def all(self, coll, where=None, limit=200, projection=None):
        with self.lock:
            rows = self.c.execute("SELECT doc FROM docs WHERE coll=? ORDER BY created DESC", (coll,)).fetchall()
        out = [json.loads(r[0]) for r in rows]
        if where:
            out = [d for d in out if all(d.get(k) == v for k, v in where.items())]
        out = out[:limit]
        if projection:
            keep = {k for k, v in projection.items() if v} | {"_id"}
            out = [{k: v for k, v in d.items() if k in keep} for d in out]
        return out

    def consume(self, uid, day, limit):
        with self.lock:
            d = self.get("usage", f"{uid}:{day}") or {"owner": uid, "created": time.time(), "count": 0}
            if d["count"] >= limit:
                return None
            d["count"] += 1
            self.c.execute("INSERT OR REPLACE INTO docs VALUES('usage',?,?,?,?)",
                           (f"{uid}:{day}", uid, d["created"], json.dumps({**d, "_id": f"{uid}:{day}"})))
            self.c.commit()
            return d["count"]

    def refund(self, uid, day):
        with self.lock:
            d = self.get("usage", f"{uid}:{day}")
            if d and d["count"] > 0:
                self.update("usage", f"{uid}:{day}", {"count": d["count"] - 1})

    def used(self, uid, day):
        d = self.get("usage", f"{uid}:{day}")
        return d["count"] if d else 0


def open_store():
    uri = os.getenv("MONGODB_URI")
    if uri:
        return MongoStore(uri, os.getenv("DB_NAME", "aeterna"))
    print("[aeterna] MONGODB_URI not set -> using local SQLite (data is lost when a Hugging Face Space restarts).")
    return SqliteStore(os.getenv("AETERNA_DB", "aeterna.db"))
