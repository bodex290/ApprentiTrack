"""Quick utility to view the contents of a SQLite database."""

import sqlite3
import sys

db_path = sys.argv[1] if len(sys.argv) > 1 else "test.db"

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# List all tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
tables = cur.fetchall()
print(f"Database: {db_path}")
print(f"Tables found: {len(tables)}\n")

for (table_name,) in tables:
    print(f"{'=' * 50}")
    print(f"  TABLE: {table_name}")
    print(f"{'=' * 50}")

    cur.execute(f"PRAGMA table_info({table_name});")
    columns = cur.fetchall()
    col_names = [col[1] for col in columns]
    print(f"  Columns: {', '.join(col_names)}")

    cur.execute(f"SELECT * FROM {table_name};")
    rows = cur.fetchall()
    print(f"  Rows: {len(rows)}")

    for row in rows:
        print(f"    {row}")
    print()

conn.close()
