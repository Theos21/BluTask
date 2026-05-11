-- ============================================================
-- Sports space enhancements: YouTube URLs, roster, attendance
-- ============================================================

ALTER TABLE public.sports_drills
  ADD COLUMN IF NOT EXISTS youtube_url  TEXT,
  ADD COLUMN IF NOT EXISTS skill_level  TEXT DEFAULT 'all';

ALTER TABLE public.sports_sessions
  ADD COLUMN IF NOT EXISTS attendance   INTEGER;

CREATE TABLE IF NOT EXISTS public.sports_roster (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  position   TEXT,
  number     INTEGER,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sports_roster ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sports_roster_owner" ON public.sports_roster USING (auth.uid() = user_id);
