/*
  # Add insert policy for score_logs table

  1. Security Changes
    - Add policy to allow authenticated users to insert records into score_logs table
*/

CREATE POLICY "Enable insert for authenticated users"
  ON score_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);