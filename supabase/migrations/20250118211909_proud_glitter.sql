/*
  # Convert student ID to integer with serial

  1. Changes
    - Change student ID from UUID to integer with serial
    - Update foreign key references in score_logs table
  2. Security
    - Maintain existing RLS policies
*/

-- Create new tables with integer IDs
CREATE TABLE IF NOT EXISTS students_new (
  id serial PRIMARY KEY,
  name text NOT NULL,
  daily_score integer DEFAULT 100,
  weekly_score integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS score_logs_new (
  id serial PRIMARY KEY,
  student_id integer REFERENCES students_new(id),
  action text NOT NULL,
  points_change integer NOT NULL,
  timestamp timestamptz DEFAULT now(),
  category text NOT NULL,
  subcategory text NOT NULL
);

-- Copy data from old tables to new tables
INSERT INTO students_new (name, daily_score, weekly_score)
SELECT name, daily_score, weekly_score FROM students;

INSERT INTO score_logs_new (student_id, action, points_change, timestamp, category, subcategory)
SELECT 
  (SELECT id FROM students_new WHERE name = (SELECT name FROM students WHERE id = score_logs.student_id)),
  action,
  points_change,
  timestamp,
  category,
  subcategory
FROM score_logs;

-- Drop old tables
DROP TABLE score_logs;
DROP TABLE students;

-- Rename new tables to original names
ALTER TABLE students_new RENAME TO students;
ALTER TABLE score_logs_new RENAME TO score_logs;

-- Enable RLS on new tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_logs ENABLE ROW LEVEL SECURITY;

-- Recreate policies
CREATE POLICY "Enable read access for all users" ON students
  FOR SELECT USING (true);

CREATE POLICY "Enable write access for authenticated users" ON students
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users" ON score_logs
  FOR SELECT USING (true);

CREATE POLICY "Enable write access for authenticated users" ON score_logs
  FOR ALL USING (auth.role() = 'authenticated');

-- Add insert policy for score_logs
CREATE POLICY "Enable insert for authenticated users" ON score_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);