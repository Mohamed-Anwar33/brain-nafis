-- =====================================================
-- Database Cleanup Script
-- Purpose: Fix false email notifications issue
-- =====================================================

-- Step 1: Review all attempts without email notification
-- This will show you what will be affected
SELECT 
    id,
    student_name,
    score,
    question_count,
    started_at,
    teacher_email_sent
FROM attempts
WHERE teacher_email_sent = false
ORDER BY started_at DESC;

-- Step 2: Delete test attempts (from AdminSettings email test)
-- These are temporary test attempts that should have been deleted
DELETE FROM attempts
WHERE student_name = 'اختبار النظام';

-- Step 3: Mark all old attempts as "email sent" to prevent duplicate emails
-- This will prevent the system from sending emails for old exam attempts
-- Adjust the time interval as needed (currently set to 1 day)
UPDATE attempts
SET teacher_email_sent = true
WHERE teacher_email_sent = false
  AND started_at < NOW() - INTERVAL '1 day';

-- Step 4: Verify cleanup - should return 0 or only very recent attempts
SELECT COUNT(*) as remaining_attempts_without_email
FROM attempts
WHERE teacher_email_sent = false;

-- Step 5: (Optional) View the remaining attempts
SELECT 
    id,
    student_name,
    score,
    started_at,
    teacher_email_sent
FROM attempts
WHERE teacher_email_sent = false
ORDER BY started_at DESC;
