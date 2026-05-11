-- ============================================================
-- Phase 3: Sports, Gym, Books spaces
-- ============================================================

-- ── Profile columns ──────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_sports BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_gym    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_books  BOOLEAN DEFAULT false;

-- ── SPORTS ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sports_sessions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL DEFAULT 'practice' CHECK (type IN ('practice','game','tournament')),
  title         TEXT NOT NULL,
  date          DATE,
  location      TEXT,
  notes         TEXT,
  completed     BOOLEAN DEFAULT false,
  score_us      INTEGER,
  score_them    INTEGER,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sports_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sports_sessions_owner" ON public.sports_sessions USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.sports_drills (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT,
  duration_minutes INTEGER,
  position        INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sports_drills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sports_drills_owner" ON public.sports_drills USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.sports_equipment (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  quantity   INTEGER DEFAULT 1,
  condition  TEXT DEFAULT 'good' CHECK (condition IN ('good','fair','needs_repair','replace')),
  notes      TEXT,
  checked    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sports_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sports_equipment_owner" ON public.sports_equipment USING (auth.uid() = user_id);

-- ── GYM ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gym_exercises (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  category     TEXT DEFAULT 'strength' CHECK (category IN ('strength','cardio','flexibility','other')),
  created_at   TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.gym_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gym_exercises_owner" ON public.gym_exercises USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.gym_workouts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  split_type  TEXT DEFAULT 'custom',
  position    INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.gym_workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gym_workouts_owner" ON public.gym_workouts USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.gym_workout_exercises (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id     UUID NOT NULL REFERENCES public.gym_workouts(id) ON DELETE CASCADE,
  exercise_name  TEXT NOT NULL,
  sets           INTEGER DEFAULT 3,
  reps_target    TEXT DEFAULT '8-12',
  weight_target  NUMERIC,
  weight_unit    TEXT DEFAULT 'lbs',
  position       INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.gym_workout_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gym_workout_exercises_owner" ON public.gym_workout_exercises
  USING (auth.uid() = (SELECT user_id FROM public.gym_workouts WHERE id = workout_id));

CREATE TABLE IF NOT EXISTS public.gym_logs (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id       UUID REFERENCES public.gym_workouts(id) ON DELETE SET NULL,
  workout_name     TEXT NOT NULL,
  date             DATE DEFAULT CURRENT_DATE,
  notes            TEXT,
  duration_minutes INTEGER,
  created_at       TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.gym_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gym_logs_owner" ON public.gym_logs USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.gym_log_sets (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  log_id        UUID NOT NULL REFERENCES public.gym_logs(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  set_number    INTEGER NOT NULL,
  weight        NUMERIC,
  reps          INTEGER,
  completed     BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.gym_log_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gym_log_sets_owner" ON public.gym_log_sets
  USING (auth.uid() = (SELECT user_id FROM public.gym_logs WHERE id = log_id));

-- ── BOOKS ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.books (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  author        TEXT,
  total_pages   INTEGER,
  current_page  INTEGER DEFAULT 0,
  status        TEXT DEFAULT 'tbr' CHECK (status IN ('tbr','reading','finished','dnf')),
  rating        INTEGER CHECK (rating >= 1 AND rating <= 5),
  cover_color   TEXT DEFAULT '#6366f1',
  genre         TEXT,
  started_at    DATE,
  finished_at   DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "books_owner" ON public.books USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.book_notes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id     UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  page_number INTEGER,
  type        TEXT DEFAULT 'note' CHECK (type IN ('note','highlight','quote')),
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.book_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "book_notes_owner" ON public.book_notes USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.reading_goals (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year       INTEGER NOT NULL,
  goal_books INTEGER DEFAULT 12,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, year)
);
ALTER TABLE public.reading_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reading_goals_owner" ON public.reading_goals USING (auth.uid() = user_id);
