import sqlite3
import json

DB = r'C:\Users\Desy Ora\.local\share\mimocode\mimocode.db'
conn = sqlite3.connect(DB)
cur = conn.cursor()

# Get user messages from the most recent real work session
session_id = 'ses_094839bc7ffeO7l9Jf5RGQpgVd'
print(f"=== Session: {session_id} ===")
cur.execute("""
    SELECT m.id, json_extract(m.data, '$.role'), json_extract(p.data, '$.type'),
           json_extract(p.data, '$.tool'), substr(p.data, 1, 600)
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id = ?
    ORDER BY m.time_created, p.time_created
""", (session_id,))
for row in cur.fetchall():
    print(row)

print("\n\n=== Also check ses_09ae76271ffe3r65e6t8OqlU8R (Fix Error Join Kelas) ===")
session_id2 = 'ses_09ae76271ffe3r65e6t8OqlU8R'
cur.execute("""
    SELECT m.id, json_extract(m.data, '$.role'), json_extract(p.data, '$.type'),
           json_extract(p.data, '$.tool'), substr(p.data, 1, 600)
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id = ?
    ORDER BY m.time_created, p.time_created
""", (session_id2,))
for row in cur.fetchall():
    print(row)

conn.close()
