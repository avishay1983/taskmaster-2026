
ALTER TABLE public.tasks ADD COLUMN assignee_ids text[] NOT NULL DEFAULT '{}';

UPDATE public.tasks SET assignee_ids = ARRAY[assignee_id] WHERE assignee_id IS NOT NULL AND assignee_id != '';

ALTER TABLE public.tasks DROP COLUMN assignee_id;
