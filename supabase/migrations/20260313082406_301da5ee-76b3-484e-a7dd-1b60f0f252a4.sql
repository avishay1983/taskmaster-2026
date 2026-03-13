-- Fix tasks where due_day=4 (Thursday) but due_date is 2026-03-18 (Wednesday)
-- Correct date should be 2026-03-19 (Thursday)
UPDATE tasks SET due_date = '2026-03-19' WHERE due_day = 4 AND due_date = '2026-03-18';

-- Fix task where due_day=5 (Friday) but due_date is 2026-03-12 (Wednesday)
-- The next Friday from when it was created should be 2026-03-13
UPDATE tasks SET due_date = '2026-03-13' WHERE due_day = 5 AND due_date = '2026-03-12';

-- Fix task where due_day=6 (Saturday) but due_date is 2026-03-14 (Friday, should be Saturday 2026-03-14 is actually Saturday)
-- Actually March 14 2026 is Saturday, so that's correct. No fix needed.