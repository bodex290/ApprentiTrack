"""Create module_ksbs table and seed official module-to-KSB mappings."""
import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), '..', 'db', 'app.db')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Check if table already exists
tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
if 'module_ksbs' in tables:
    print('module_ksbs table already exists, checking data...')
    count = cur.execute("SELECT COUNT(*) FROM module_ksbs").fetchone()[0]
    if count > 0:
        print(f'  Already has {count} mappings, skipping seed.')
        conn.close()
        exit()
else:
    cur.execute('''CREATE TABLE module_ksbs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        module_id INTEGER NOT NULL REFERENCES modules(id),
        ksb_id INTEGER NOT NULL REFERENCES ksbs(id),
        UNIQUE(module_id, ksb_id)
    )''')
    print('Created module_ksbs table')

# Official KSB-to-module mappings for the IoT/Digital programme
# Each module covers specific Knowledge (K), Skill (S) and Behaviour (B) items
mappings = [
    # IOT552U (id=1) - Business Organisation & Decision Making
    (1, 1),   # K1 - digital technology solutions in organisations
    (1, 2),   # K2 - value of technology investments
    (1, 6),   # S1 - analyse business problem
    (1, 8),   # S3 - structured problem-solving
    (1, 11),  # B1 - work independently and collaboratively
    (1, 13),  # B3 - act with integrity

    # IOT553U (id=2) - Software Engineering Principles
    (2, 3),   # K3 - computing architectures
    (2, 7),   # S2 - design, implement, test software
    (2, 8),   # S3 - structured problem-solving
    (2, 11),  # B1 - work independently and collaboratively
    (2, 12),  # B2 - continuous professional development

    # IOT554U (id=3) - Data Fundamentals
    (3, 4),   # K4 - data analysis principles
    (3, 6),   # S1 - analyse business problem
    (3, 9),   # S4 - manage data effectively
    (3, 12),  # B2 - continuous professional development

    # IOT555U (id=4) - Cyber Security Essentials
    (4, 5),   # K5 - legislation, policies, ethics
    (4, 9),   # S4 - manage data effectively
    (4, 10),  # S5 - information security principles
    (4, 13),  # B3 - act with integrity
]

cur.executemany('INSERT INTO module_ksbs (module_id, ksb_id) VALUES (?, ?)', mappings)
print(f'Seeded {len(mappings)} module-KSB mappings')

conn.commit()
conn.close()
print('Done')
