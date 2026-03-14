
ALTER TABLE public.tasks ADD COLUMN is_backlog boolean NOT NULL DEFAULT false;
ALTER TABLE public.tasks ALTER COLUMN workspace_id DROP NOT NULL;
ALTER TABLE public.tasks DROP CONSTRAINT tasks_workspace_id_fkey;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
