/*
  # Add initial students

  1. Data Changes
    - Add initial students to the students table
*/

INSERT INTO students (id, name, daily_score, weekly_score)
VALUES 
  (gen_random_uuid(), 'אדם כהן', 100, 0),
  (gen_random_uuid(), 'מיכל לוי', 100, 0),
  (gen_random_uuid(), 'דניאל אברהם', 100, 0),
  (gen_random_uuid(), 'נועה שמעוני', 100, 0)
ON CONFLICT (id) DO NOTHING;