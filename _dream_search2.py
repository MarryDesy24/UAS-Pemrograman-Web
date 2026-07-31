import sqlite3

DB = r'C:\Users\Desy Ora\.local\share\mimocode\mimocode.db'
conn = sqlite3.connect(DB)
cur = conn.cursor()

# First check the message table schema
cur.execute("PRAGMA table_info(message)")
print("=== message table columns ===")
for row in cur.fetchall():
    print(row)

print()

# Get all session IDs for this project
cur.execute("""
    SELECT id FROM session 
    WHERE project_id = 'f1c0960a-b534-46d4-8509-d66f1284d08d'
      AND title NOT LIKE 'checkpoint-writer%%'
""")
session_ids = [r[0] for r in cur.fetchall()]
print(f"Project sessions: {session_ids}")

# Search user messages for keywords
keywords = ['always', 'commit', 'push', 'github', 'vercel', 'deploy', 'responsif', 'mobile', 'handphone', 'fix', 'lanjut', 'baru']

for kw in keywords:
    placeholders = ','.join(['?' for _ in session_ids])
    query = f"""
        SELECT m.session_id, m.time_created, substr(json_extract(p.data, '$.text'), 1, 400)
        FROM message m
        JOIN part p ON p.message_id = m.id
        WHERE json_extract(m.data, '$.role') = 'user'
          AND json_extract(p.data, '$.type') = 'text'
          AND m.session_id IN ({placeholders})
          AND json_extract(p.data, '$.text') LIKE ?
        ORDER BY m.time_created DESC
        LIMIT 5
    """
    cur.execute(query, session_ids + [f'%{kw}%'])
    rows = cur.fetchall()
    if rows:
        print(f"\n=== Keyword: {kw} ===")
        for row in rows:
            text = row[2] if row[2] else '(no text)'
            print(f"  [{row[0]}] time={row[1]}")
            print(f"  {text}")

conn.close()
