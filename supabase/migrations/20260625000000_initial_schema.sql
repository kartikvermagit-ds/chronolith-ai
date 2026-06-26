-- Supabase Schema: Initial Setup
-- This script sets up the initial database schema for the application.

-- 1. Custom Types
CREATE TYPE public.goal_status AS ENUM ('not_started', 'in_progress', 'completed');

-- 2. Tables
-- USERS (Profiles)
-- This table stores public user data. It is linked to the auth.users table.
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.profiles IS 'Public profile information for each user.';

-- GOALS
-- This table stores user goals.
CREATE TABLE public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status public.goal_status NOT NULL DEFAULT 'not_started',
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.goals IS 'User-defined goals.';

-- ROADMAPS
-- This table stores AI-generated roadmaps for each goal.
CREATE TABLE public.roadmaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    steps JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.roadmaps IS 'AI-generated roadmaps to achieve goals.';

-- AI HISTORY
-- This table stores the history of user interactions with the AI.
CREATE TABLE public.ai_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    response TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ai_history IS 'History of user prompts and AI responses.';

-- 3. Indexes
-- Create indexes on foreign key columns for performance.
CREATE INDEX ON public.goals (user_id);
CREATE INDEX ON public.roadmaps (user_id);
CREATE INDEX ON public.roadmaps (goal_id);
CREATE INDEX ON public.ai_history (user_id);

-- 4. Row Level Security (RLS)
-- Enable RLS for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_history ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- PROFILES
-- Users can view all profiles.
CREATE POLICY "Public profiles are viewable by everyone."
ON public.profiles FOR SELECT
USING ( true );

-- Users can only insert their own profile.
CREATE POLICY "Users can insert their own profile."
ON public.profiles FOR INSERT
WITH CHECK ( auth.uid() = id );

-- Users can only update their own profile.
CREATE POLICY "Users can update own profile."
ON public.profiles FOR UPDATE
USING ( auth.uid() = id )
WITH CHECK ( auth.uid() = id );

-- GOALS
-- Users can only view their own goals.
CREATE POLICY "Users can view their own goals."
ON public.goals FOR SELECT
USING ( auth.uid() = user_id );

-- Users can insert goals for themselves.
CREATE POLICY "Users can insert their own goals."
ON public.goals FOR INSERT
WITH CHECK ( auth.uid() = user_id );

-- Users can update their own goals.
CREATE POLICY "Users can update their own goals."
ON public.goals FOR UPDATE
USING ( auth.uid() = user_id )
WITH CHECK ( auth.uid() = user_id );

-- Users can delete their own goals.
CREATE POLICY "Users can delete their own goals."
ON public.goals FOR DELETE
USING ( auth.uid() = user_id );

-- ROADMAPS
-- Users can only view their own roadmaps.
CREATE POLICY "Users can view their own roadmaps."
ON public.roadmaps FOR SELECT
USING ( auth.uid() = user_id );

-- Users can insert roadmaps for themselves.
CREATE POLICY "Users can insert their own roadmaps."
ON public.roadmaps FOR INSERT
WITH CHECK ( auth.uid() = user_id );

-- Users can update their own roadmaps.
CREATE POLICY "Users can update their own roadmaps."
ON public.roadmaps FOR UPDATE
USING ( auth.uid() = user_id )
WITH CHECK ( auth.uid() = user_id );

-- Users can delete their own roadmaps.
CREATE POLICY "Users can delete their own roadmaps."
ON public.roadmaps FOR DELETE
USING ( auth.uid() = user_id );

-- AI HISTORY
-- Users can only view their own AI history.
CREATE POLICY "Users can view their own AI history."
ON public.ai_history FOR SELECT
USING ( auth.uid() = user_id );

-- Users can insert their own AI history.
CREATE POLICY "Users can insert their own AI history."
ON public.ai_history FOR INSERT
WITH CHECK ( auth.uid() = user_id );

-- Users can update their own AI history.
CREATE POLICY "Users can update their own AI history."
ON public.ai_history FOR UPDATE
USING ( auth.uid() = user_id )
WITH CHECK ( auth.uid() = user_id );

-- Users can delete their own AI history.
CREATE POLICY "Users can delete their own AI history."
ON public.ai_history FOR DELETE
USING ( auth.uid() = user_id );

-- 6. Handling New User Signup
-- This function and trigger will automatically create a new profile entry
-- for each new user in auth.users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
