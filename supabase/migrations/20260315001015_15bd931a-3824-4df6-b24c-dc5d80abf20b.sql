
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text NOT NULL DEFAULT '👥',
  members text[] NOT NULL DEFAULT '{}',
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to groups"
  ON public.groups FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.workspaces ADD COLUMN group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL;
