
from flask import Flask, jsonify, render_template, request
from pathlib import Path
import sqlite3
from datetime import datetime, timezone

app = Flask(__name__)
DB = Path("data/miniboard.db")


def connect():
    DB.parent.mkdir(exist_ok=True)
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    return con


def init_db():
    with connect() as con:
        con.execute("""CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL
        )""")

        # 既存DBにlikesカラムがなければ追加
        columns = con.execute(
            "PRAGMA table_info(messages)"
        ).fetchall()

        if not any(column["name"] == "likes" for column in columns):
            con.execute(
                "ALTER TABLE messages ADD COLUMN likes INTEGER NOT NULL DEFAULT 0"
            )


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/messages")
def get_messages():
    with connect() as con:
        rows = con.execute(
            "SELECT * FROM messages ORDER BY id DESC"
        ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.post("/api/messages")
def create_message():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()[:30]
    message = str(data.get("message", "")).strip()[:300]

    if not name or not message:
        return jsonify({"error": "name and message are required"}), 400

    created_at = datetime.now(timezone.utc).isoformat()

    with connect() as con:
        cur = con.execute(
            "INSERT INTO messages(name,message,created_at) VALUES(?,?,?)",
            (name, message, created_at)
        )
        row = con.execute(
            "SELECT * FROM messages WHERE id=?",
            (cur.lastrowid,)
        ).fetchone()

    return jsonify(dict(row)), 201


@app.put("/api/messages/<int:message_id>")
def update_message(message_id):
    data = request.get_json(silent=True) or {}
    message = str(data.get("message", "")).strip()[:300]

    if not message:
        return jsonify({"error": "message is required"}), 400

    with connect() as con:
        cur = con.execute(
            "UPDATE messages SET message=? WHERE id=?",
            (message, message_id)
        )
        if cur.rowcount == 0:
            return jsonify({"error": "not found"}), 404

    return jsonify({"ok": True})


@app.delete("/api/messages/<int:message_id>")
def delete_message(message_id):
    with connect() as con:
        cur = con.execute(
            "DELETE FROM messages WHERE id=?",
            (message_id,)
        )
        if cur.rowcount == 0:
            return jsonify({"error": "not found"}), 404

    return "", 204

# ==========================================
# 参加者募集機能
# ==========================================
def init_recruitment_db():
    with connect() as con:
        con.execute("""CREATE TABLE IF NOT EXISTS recruitments (
            message_id INTEGER PRIMARY KEY,
            capacity INTEGER NOT NULL
        )""")
        con.execute("""CREATE TABLE IF NOT EXISTS participants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            UNIQUE(message_id, name)
        )""")

# モジュール読み込み時にテーブルを自動作成（既存DBもそのまま使えます）
init_recruitment_db()

@app.get("/api/recruitments")
def get_recruitments():
    with connect() as con:
        recs = con.execute("SELECT message_id, capacity FROM recruitments").fetchall()
        parts = con.execute("SELECT message_id, name FROM participants ORDER BY id ASC").fetchall()

    result = {}
    for r in recs:
        result[str(r["message_id"])] = {
            "capacity": r["capacity"],
            "participants": []
        }
    for p in parts:
        mid = str(p["message_id"])
        if mid in result:
            result[mid]["participants"].append(p["name"])
    return jsonify(result)

@app.post("/api/recruitments")
def create_recruitment():
    data = request.get_json(silent=True) or {}
    message_id = data.get("message_id")
    capacity = data.get("capacity")

    if not isinstance(message_id, int) or not isinstance(capacity, int) or not (1 <= capacity <= 50):
        return jsonify({"error": "invalid message_id or capacity (1-50)"}), 400

    with connect() as con:
        con.execute(
            "INSERT OR REPLACE INTO recruitments(message_id, capacity) VALUES(?, ?)",
            (message_id, capacity)
        )
    return jsonify({"message_id": message_id, "capacity": capacity}), 201

@app.post("/api/recruitments/<int:message_id>/join")
def join_recruitment(message_id):
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()[:30]
    if not name:
        return jsonify({"error": "参加者名を入力してください"}), 400

    with connect() as con:
        rec = con.execute(
            "SELECT capacity FROM recruitments WHERE message_id = ?",
            (message_id,)
        ).fetchone()
        if not rec:
            return jsonify({"error": "募集が見つかりません"}), 404

        count = con.execute(
            "SELECT COUNT(*) AS cnt FROM participants WHERE message_id = ?",
            (message_id,)
        ).fetchone()["cnt"]
        if count >= rec["capacity"]:
            return jsonify({"error": "すでに定員に達しています"}), 400

        try:
            con.execute(
                "INSERT INTO participants(message_id, name) VALUES(?, ?)",
                (message_id, name)
            )
        except sqlite3.IntegrityError:
            return jsonify({"error": "同じ名前で既に参加登録されています"}), 400

    return jsonify({"ok": True}), 201

# いいね機能
@app.post("/api/messages/<int:message_id>/like")
def like_message(message_id):
    with connect() as con:
        cur = con.execute(
            "UPDATE messages SET likes = likes + 1 WHERE id=?",
            (message_id,)
        )

        if cur.rowcount == 0:
            return jsonify({"error": "not found"}), 404

        row = con.execute(
            "SELECT likes FROM messages WHERE id=?",
            (message_id,)
        ).fetchone()

    return jsonify({"likes": row["likes"]})


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=False)
