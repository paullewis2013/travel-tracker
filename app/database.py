import sqlite3
import os

DB_PATH = os.environ.get("DB_PATH", "/data/travel.db")

def get_conn():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS visited (
                code TEXT PRIMARY KEY,
                name TEXT,
                kind TEXT NOT NULL CHECK(kind IN ('state', 'country')),
                visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()

def get_visited():
    with get_conn() as conn:
        rows = conn.execute("SELECT code, name, kind FROM visited").fetchall()
    return [dict(r) for r in rows]

def add_visited(code: str, name: str, kind: str):
    key = f"{kind}:{code}"
    with get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO visited (code, name, kind) VALUES (?, ?, ?)",
            (key, name, kind)
        )
        conn.commit()

def remove_visited(code: str, kind: str):
    key = f"{kind}:{code}"
    with get_conn() as conn:
        conn.execute("DELETE FROM visited WHERE code = ?", (key,))
        conn.commit()
