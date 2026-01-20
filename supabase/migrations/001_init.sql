-- Cardinal Pairwise Voting Platform
-- Database Schema and RLS Policies
-- Run this in the Supabase SQL Editor

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Options table: The items being compared
CREATE TABLE IF NOT EXISTS options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table: User profiles with privacy settings
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Votes table: Individual pairwise comparisons with conviction scores
CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    winner_id UUID NOT NULL REFERENCES options(id) ON DELETE CASCADE,
    loser_id UUID NOT NULL REFERENCES options(id) ON DELETE CASCADE,
    conviction_score INTEGER NOT NULL CHECK (conviction_score >= 0 AND conviction_score <= 10),
    pair_hash TEXT NOT NULL, -- Deterministic hash for pair uniqueness
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Each user can only vote once per pair
    CONSTRAINT unique_user_pair UNIQUE (user_id, pair_hash),
    -- Winner and loser must be different
    CONSTRAINT different_options CHECK (winner_id != loser_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_winner_id ON votes(winner_id);
CREATE INDEX IF NOT EXISTS idx_votes_loser_id ON votes(loser_id);
CREATE INDEX IF NOT EXISTS idx_votes_pair_hash ON votes(pair_hash);
CREATE INDEX IF NOT EXISTS idx_profiles_is_anonymous ON profiles(is_anonymous);

-- ============================================
-- VIEWS
-- ============================================

-- Leaderboard view: Aggregates total points per option
-- Points = SUM(wins) - SUM(losses), weighted by conviction
-- This view includes ALL votes (including anonymous users) for accurate totals
CREATE OR REPLACE VIEW leaderboard AS
SELECT
    o.id,
    o.name,
    o.description,
    o.image_url,
    COALESCE(wins.total_points, 0) AS win_points,
    COALESCE(losses.total_points, 0) AS loss_points,
    COALESCE(wins.total_points, 0) - COALESCE(losses.total_points, 0) AS net_score,
    COALESCE(wins.vote_count, 0) AS win_count,
    COALESCE(losses.vote_count, 0) AS loss_count,
    RANK() OVER (ORDER BY (COALESCE(wins.total_points, 0) - COALESCE(losses.total_points, 0)) DESC) AS rank
FROM options o
LEFT JOIN (
    SELECT
        winner_id,
        SUM(conviction_score) AS total_points,
        COUNT(*) AS vote_count
    FROM votes
    GROUP BY winner_id
) wins ON o.id = wins.winner_id
LEFT JOIN (
    SELECT
        loser_id,
        SUM(conviction_score) AS total_points,
        COUNT(*) AS vote_count
    FROM votes
    GROUP BY loser_id
) losses ON o.id = losses.loser_id
ORDER BY net_score DESC;

-- Pair consensus view: Shows average conviction per pair
CREATE OR REPLACE VIEW pair_consensus AS
SELECT
    v.pair_hash,
    o1.name AS option_a,
    o2.name AS option_b,
    v.winner_id,
    ow.name AS winner_name,
    COUNT(*) AS vote_count,
    AVG(v.conviction_score) AS avg_conviction,
    SUM(v.conviction_score) AS total_conviction
FROM votes v
JOIN options o1 ON (
    o1.id = LEAST(v.winner_id, v.loser_id)
)
JOIN options o2 ON (
    o2.id = GREATEST(v.winner_id, v.loser_id)
)
JOIN options ow ON ow.id = v.winner_id
GROUP BY v.pair_hash, o1.name, o2.name, v.winner_id, ow.name
ORDER BY total_conviction DESC;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- OPTIONS POLICIES
-- ============================================

-- Everyone can read options
CREATE POLICY "Anyone can view options"
ON options FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify options (implement admin check as needed)
-- For now, we'll allow authenticated users to insert for demo purposes
CREATE POLICY "Authenticated users can insert options"
ON options FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Everyone can read profiles (to show display names, but is_anonymous controls vote visibility)
CREATE POLICY "Anyone can view profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- ============================================
-- VOTES POLICIES
-- ============================================

-- Users can always read their own votes
CREATE POLICY "Users can read own votes"
ON votes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can read other users' votes ONLY if that user is NOT anonymous
CREATE POLICY "Users can read non-anonymous votes"
ON votes FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = votes.user_id
        AND p.is_anonymous = FALSE
    )
);

-- Users can insert their own votes
CREATE POLICY "Users can insert own votes"
ON votes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own votes
CREATE POLICY "Users can update own votes"
ON votes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can delete own votes"
ON votes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to generate a deterministic pair hash
-- Takes two option IDs and returns a consistent hash regardless of order
CREATE OR REPLACE FUNCTION generate_pair_hash(option_a UUID, option_b UUID)
RETURNS TEXT AS $$
BEGIN
    -- Sort IDs alphabetically to ensure consistency
    IF option_a::TEXT < option_b::TEXT THEN
        RETURN option_a::TEXT || '-' || option_b::TEXT;
    ELSE
        RETURN option_b::TEXT || '-' || option_a::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_votes_updated_at
    BEFORE UPDATE ON votes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA (5 Default Options)
-- ============================================

-- Insert 5 sample options for testing
INSERT INTO options (name, description) VALUES
    ('Option Alpha', 'The first option in our comparison set'),
    ('Option Beta', 'The second option with unique characteristics'),
    ('Option Gamma', 'The third option representing a different approach'),
    ('Option Delta', 'The fourth option with its own merits'),
    ('Option Epsilon', 'The fifth option completing our set')
ON CONFLICT DO NOTHING;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant usage on the views
GRANT SELECT ON leaderboard TO authenticated;
GRANT SELECT ON pair_consensus TO authenticated;

-- ============================================
-- REALTIME (Optional)
-- ============================================

-- Enable realtime for votes table (for live updates)
-- Uncomment if you want realtime subscriptions
-- ALTER PUBLICATION supabase_realtime ADD TABLE votes;
-- ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
