import sqlite3
import json

DB = r'C:\Users\Desy Ora\.local\share\mimocode\mimocode.db'
conn = sqlite3.connect(DB)
cur = conn.cursor()

# Check session ses_094839bc7ffeO7l9Jf5RGQpgVd (QR join kelas)
session_id = 'ses_094839bc7ffeO7l9Jf5RGQpgVd'
print(f"=== Session: {session_id} (QR join kelas dengan Supabase tanpa Vercel) ===")
cur.execute("""
    SELECT m.id, json_extract(m.data, '$.role'), json_extract(p.data, '$.type'),
           json_extract(p.data, '$.tool'), substr(p.data, 1, 600)
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id = ?
    ORDER BY m.time_created, p.time_created
""", (session_id,))
for row in cur.fetchall():
    role = row[1]
    ptype = row[2]
    tool = row[3]
    preview = row[4] if row[4] else ''
    if role == 'user' and ptype == 'text':
        print(f"\n[USER] {preview[:400]}")
    elif role == 'assistant' and ptype == 'tool':
        print(f"  [TOOL:{tool}] {preview[:300]}")
    elif role == 'assistant' and ptype == 'text':
        print(f"  [ASST] {preview[:300]}")

conn.close()
