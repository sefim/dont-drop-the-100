/*
  # Add student table authorization

  1. Security Changes
    - Update RLS policies for students table
    - Add specific policies for CRUD operations
    - Ensure only authenticated users can modify data

  2. Changes
    - Drop existing policies
    - Add new granular policies for better security control
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON students;
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON students;

-- Create new specific policies
CREATE POLICY "Allow read access for authenticated users"
ON students
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow insert for authenticated users"
ON students
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users"
ON students
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow delete for authenticated users"
ON students
FOR DELETE
TO authenticated
USING (true);