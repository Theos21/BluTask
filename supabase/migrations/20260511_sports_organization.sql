-- ============================================================
-- Sports organization: multi-sport / multi-season management
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sports (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sport_type  TEXT DEFAULT 'other',
  season      TEXT,
  team_name   TEXT,
  league      TEXT,
  color       TEXT DEFAULT '#f97316',
  goals       TEXT,
  status      TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sports_owner" ON public.sports USING (auth.uid() = user_id);

-- Link existing child tables to a sport (nullable so old rows remain valid)
ALTER TABLE public.sports_sessions  ADD COLUMN IF NOT EXISTS sport_id UUID REFERENCES public.sports(id) ON DELETE SET NULL;
ALTER TABLE public.sports_drills    ADD COLUMN IF NOT EXISTS sport_id UUID REFERENCES public.sports(id) ON DELETE SET NULL;
ALTER TABLE public.sports_equipment ADD COLUMN IF NOT EXISTS sport_id UUID REFERENCES public.sports(id) ON DELETE SET NULL;
ALTER TABLE public.sports_roster    ADD COLUMN IF NOT EXISTS sport_id UUID REFERENCES public.sports(id) ON DELETE SET NULL;
