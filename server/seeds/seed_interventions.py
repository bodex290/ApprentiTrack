"""Seed the intervention_flags table."""
import sqlite3

conn = sqlite3.connect("db/app.db")

conn.execute("DELETE FROM intervention_flags")

conn.executescript("""
INSERT INTO intervention_flags (apprentice_id, reason, severity, detail, status, raised_by) VALUES
    (4, 'Low KSB coverage',       'high',   'Only 2 of 13 KSBs evidenced after 6 months on programme.', 'open',        'Dr. Patel'),
    (5, 'Low KSB coverage',       'medium', 'Only 2 of 13 KSBs evidenced – monitor at next review.',    'open',        'Ms. Chen'),
    (3, 'Overdue submission',      'medium', 'Database Implementation Project (IOT554U) still in draft past due date.', 'in_progress', 'Dr. Patel'),
    (2, 'Insufficient feedback',   'low',    'No coach feedback recorded on 1 of 2 submissions.',        'open',        'Mr. Okafor'),
    (1, 'KSB gap in Behaviours',   'low',    'No Behaviour KSBs evidenced yet – flag for review.',       'resolved',    'Dr. Patel');
""")

conn.close()
print("Intervention flags seeded successfully")
