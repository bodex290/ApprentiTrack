-- ============================================================
-- ApprentiTrack – Synthetic Sample Data
-- ============================================================
-- All data below is fictional and created solely for
-- demonstration purposes.
-- ============================================================

-- Cohorts
INSERT INTO cohorts (name, programme, start_date, end_date) VALUES
    ('Sept 2024 Cohort', 'Digital & Technology Solutions', '2024-09-01', '2027-09-01'),
    ('Jan 2025 Cohort',  'Digital & Technology Solutions', '2025-01-15', '2028-01-15');

-- Apprentices
INSERT INTO apprentices (first_name, last_name, email, cohort_id, employer) VALUES
    ('Alex',   'Morgan',   'alex.morgan@example.com',   1, 'Acme Corp'),
    ('Jordan', 'Smith',    'jordan.smith@example.com',  1, 'Globex Ltd'),
    ('Taylor', 'Brown',    'taylor.brown@example.com',  1, 'Initech'),
    ('Casey',  'Williams', 'casey.williams@example.com', 2, 'Soylent Inc'),
    ('Riley',  'Jones',    'riley.jones@example.com',   2, 'Hooli');

-- Modules
INSERT INTO modules (code, title, credits) VALUES
    ('IOT552U', 'Business Organisation & Decision Making', 20),
    ('IOT553U', 'Software Engineering Principles',         20),
    ('IOT554U', 'Data Fundamentals',                       20),
    ('IOT555U', 'Cyber Security Essentials',               20);

-- Assessments
INSERT INTO assessments (module_id, title, description, due_date) VALUES
    (1, 'Data Modelling Report',         'Design a relational data model for a business scenario.', '2025-03-15'),
    (1, 'SQL Analytics Portfolio',       'Write analytical SQL queries on a sample dataset.',       '2025-04-30'),
    (2, 'Software Design Document',      'Produce a design document for a web application.',        '2025-05-15'),
    (3, 'Database Implementation Project','Build and populate a relational database.',               '2025-06-01'),
    (4, 'Security Risk Assessment',      'Analyse security risks for a given case study.',          '2025-06-15');

-- KSBs (sample from Digital & Technology Solutions standard)
INSERT INTO ksbs (code, type, description) VALUES
    ('K1',  'Knowledge', 'How organisations adapt and exploit digital technology solutions.'),
    ('K2',  'Knowledge', 'The value of technology investments and how to quantify benefits.'),
    ('K3',  'Knowledge', 'Contemporary computing architectures and infrastructure.'),
    ('K4',  'Knowledge', 'Principles of data analysis and how to apply them.'),
    ('K5',  'Knowledge', 'Legislation, policies and ethics relating to digital technology.'),
    ('S1',  'Skill',     'Analyse a business problem and identify the role of digital systems.'),
    ('S2',  'Skill',     'Design, implement and test a software solution.'),
    ('S3',  'Skill',     'Apply structured techniques to problem-solving.'),
    ('S4',  'Skill',     'Manage data effectively and ethically.'),
    ('S5',  'Skill',     'Apply information security principles.'),
    ('B1',  'Behaviour', 'Work independently and collaboratively in a professional manner.'),
    ('B2',  'Behaviour', 'Demonstrate continuous professional development.'),
    ('B3',  'Behaviour', 'Act with integrity and respect in a workplace environment.');

-- Evidence Submissions
INSERT INTO evidence_submissions (apprentice_id, assessment_id, title, status) VALUES
    (1, 1, 'ER Diagram & Normalisation Report',   'accepted'),
    (1, 2, 'Sales Analytics SQL Queries',          'reviewed'),
    (2, 1, 'Data Model for Retail Scenario',       'submitted'),
    (2, 3, 'React App Design Document',            'submitted'),
    (3, 1, 'Hospital Data Model Report',           'accepted'),
    (3, 4, 'Student Records Database Build',       'draft'),
    (4, 5, 'Security Threat Analysis for SMEs',    'submitted'),
    (5, 2, 'Revenue Dashboard SQL Portfolio',      'reviewed');

-- Submission–KSB mappings
INSERT INTO submission_ksbs (submission_id, ksb_id, notes) VALUES
    (1, 4,  'Demonstrates understanding of relational data principles.'),
    (1, 6,  'Analysed business requirements and modelled data.'),
    (2, 4,  'Applied SQL analytics to a sales dataset.'),
    (2, 8,  'Used structured querying techniques.'),
    (3, 4,  'Designed a normalised data model.'),
    (4, 7,  'Designed and planned a React application.'),
    (4, 8,  'Applied structured problem-solving to design.'),
    (5, 4,  'Comprehensive data modelling approach.'),
    (5, 11, 'Worked independently on the project.'),
    (6, 9,  'Managed data ethically in a database project.'),
    (7, 5,  'Applied security legislation knowledge.'),
    (7, 10, 'Assessed information security risks.'),
    (8, 4,  'SQL analytics on revenue data.'),
    (8, 8,  'Structured analytical approach.');

-- Coach Feedback
INSERT INTO coach_feedback (submission_id, coach_name, rating, comments) VALUES
    (1, 'Dr. Patel',     5, 'Excellent ER diagram with clear normalisation rationale.'),
    (2, 'Dr. Patel',     4, 'Good range of queries – consider adding window functions.'),
    (3, 'Ms. Chen',      3, 'Solid start – needs more detail on relationships.'),
    (5, 'Dr. Patel',     5, 'Outstanding work – very thorough.'),
    (7, 'Mr. Okafor',    4, 'Well-structured risk assessment with clear mitigations.'),
    (8, 'Ms. Chen',      4, 'Good analytical depth – expand the commentary.');

-- Intervention Flags
INSERT INTO intervention_flags (apprentice_id, reason, severity, detail, status, raised_by) VALUES
    (4, 'Low KSB coverage',       'high',   'Only 2 of 13 KSBs evidenced after 6 months on programme.', 'open',        'Dr. Patel'),
    (5, 'Low KSB coverage',       'medium', 'Only 2 of 13 KSBs evidenced – monitor at next review.', 'open',        'Ms. Chen'),
    (3, 'Overdue submission',      'medium', 'Database Implementation Project (IOT554U) still in draft past due date.', 'in_progress', 'Dr. Patel'),
    (2, 'Insufficient feedback',   'low',    'No coach feedback recorded on 1 of 2 submissions.',  'open',        'Mr. Okafor'),
    (1, 'KSB gap in Behaviours',   'low',    'No Behaviour KSBs evidenced yet – flag for review.',  'resolved',    'Dr. Patel');
