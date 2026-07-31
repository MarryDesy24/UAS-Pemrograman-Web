import sqlite3
import json

DB = r'C:\Users\Desy Ora\.local\share\mimocode\mimocode.db'
conn = sqlite3.connect(DB)
cur = conn.cursor()

# Search for user messages containing key decision/rule keywords
keywords = ['always', 'never', 'remember', 'rule', 'decision', 'decided', 'commit', 'push', 'github', 'vercel', 'deploy', 'responsif', 'mobile', 'handphone', 'fix']

for kw in keywords:
    cur.execute("""
        SELECT m.session_id, m.time_created, json_extract(p.data, '$.text')
        FROM message m
        JOIN part p ON p.message_id = m.id
        WHERE json_extract(m.data, '$.role') = 'user'
          AND json_extract(p.data, '$.type') = 'text'
          AND m.project_id = 'f1c0960a-b534-46d4-8509-d66f1284d08d'
          AND json_extract(p.data, '$.text') LIKE ?
        ORDER BY m.time_created DESC
        LIMIT 5
    """, (f'%{kw}%',))
    rows = cur.fetchall()
    if rows:
        print(f"\n=== Keyword: {kw} ===")
        for row in rows:
            text = row[2] if row[2] else '(no text)'
            # Truncate for readability
            if len(text) > 300:
                text = text[:300] + '...'
            print(f"  Session: {row[0]}, Time: {row[1]}")
            print(f"  Text: {text}")

conn.close()
