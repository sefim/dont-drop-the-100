/*
  # Initial Schema Setup for Student Score App

  1. New Tables
    - `students`
      - `id` (uuid, primary key)
      - `name` (text)
      - `daily_score` (integer)
      - `weekly_score` (integer)
    - `class_score`
      - `id` (integer, primary key)
      - `score` (integer)
    - `score_logs`
      - `id` (uuid, primary key)
      - `student_id` (uuid, foreign key)
      - `action` (text)
      - `points_change` (integer)
      - `timestamp` (timestamptz)
      - `category` (text)
      - `subcategory` (text)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  daily_score integer DEFAULT 100,
  weekly_score integer DEFAULT 0
);

-- Create class score table
CREATE TABLE IF NOT EXISTS class_score (
  id integer PRIMARY KEY DEFAULT 1,
  score integer DEFAULT 0,
  CONSTRAINT single_row CHECK (id = 1)
);

-- Create score logs table
CREATE TABLE IF NOT EXISTS score_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id),
  action text NOT NULL,
  points_change integer NOT NULL,
  timestamp timestamptz DEFAULT now(),
  category text NOT NULL,
  subcategory text NOT NULL
);

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_score ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON students
  FOR SELECT USING (true);

CREATE POLICY "Enable write access for authenticated users" ON students
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users" ON class_score
  FOR SELECT USING (true);

CREATE POLICY "Enable write access for authenticated users" ON class_score
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users" ON score_logs
  FOR SELECT USING (true);

CREATE POLICY "Enable write access for authenticated users" ON score_logs
  FOR ALL USING (auth.role() = 'authenticated');

-- Insert initial class score record
INSERT INTO class_score (id, score) VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;