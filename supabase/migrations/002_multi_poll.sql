-- Multi-Poll Feature Migration
-- Adds support for multiple polls with per-poll anonymity

-- ============================================
-- NEW TABLES
-- ============================================

-- Polls table: Contains poll metadata
CREATE TABLE IF NOT EXISTS polls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Poll options junction table: Links options to polls
CREATE TABLE IF NOT EXISTS poll_options (
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES options(id) ON DELETE CASCADE,
    PRIMARY KEY (poll_id, option_id)
);

-- Poll participants: Tracks user participation and per-poll anonymity
CREATE TABLE IF NOT EXISTS poll_participants (
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_anonymous BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    PRIMARY KEY (poll_id, user_id)
);

-- ============================================
-- MODIFY EXISTING TABLES
-- ============================================

-- Add is_admin column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Add poll_id column to votes (nullable initially for migration)
ALTER TABLE votes ADD COLUMN IF NOT EXISTS poll_id UUID REFERENCES polls(id) ON DELETE CASCADE;

-- ============================================
-- DATA MIGRATION
-- ============================================

-- Create a "Default Poll" for existing data
DO $$
DECLARE
    default_poll_id UUID;
BEGIN
    -- Only run if there are existing votes without poll_id
    IF EXISTS (SELECT 1 FROM votes WHERE poll_id IS NULL) THEN
        -- Create the default poll
        INSERT INTO polls (title, description, is_active)
        VALUES ('Default Poll', 'Original poll containing all existing votes', TRUE)
        RETURNING id INTO default_poll_id;

        -- Link all existing options to the default poll
        INSERT INTO poll_options (poll_id, option_id)
        SELECT default_poll_id, id FROM options
        ON CONFLICT DO NOTHING;

        -- Update all existing votes to reference the default poll
        UPDATE votes SET poll_id = default_poll_id WHERE poll_id IS NULL;

        -- Create poll_participants entries for existing voters
        INSERT INTO poll_participants (poll_id, user_id, is_anonymous, completed_at)
        SELECT DISTINCT default_poll_id, v.user_id, p.is_anonymous, MAX(v.created_at)
        FROM votes v
        JOIN profiles p ON p.id = v.user_id
        WHERE v.poll_id = default_poll_id
        GROUP BY v.user_id, p.is_anonymous
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_polls_is_active ON polls(is_active);
CREATE INDEX IF NOT EXISTS idx_polls_created_by ON polls(created_by);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_option_id ON poll_options(option_id);
CREATE INDEX IF NOT EXISTS idx_poll_participants_poll_id ON poll_participants(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_participants_user_id ON poll_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_poll_id ON votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

-- ============================================
-- UPDATE CONSTRAINT
-- ============================================

-- Drop old unique constraint and add new one including poll_id
ALTER TABLE votes DROP CONSTRAINT IF EXISTS unique_user_pair;
ALTER TABLE votes ADD CONSTRAINT unique_user_poll_pair UNIQUE (user_id, poll_id, pair_hash);

-- ============================================
-- VIEWS
-- ============================================

-- Drop and recreate leaderboard view to filter by poll
DROP VIEW IF EXISTS leaderboard;
CREATE OR REPLACE VIEW leaderboard AS
SELECT
    o.id,
    o.name,
    o.description,
    o.image_url,
    v.poll_id,
    COALESCE(wins.total_points, 0) AS win_points,
    COALESCE(losses.total_points, 0) AS loss_points,
    COALESCE(wins.total_points, 0) - COALESCE(losses.total_points, 0) AS net_score,
    COALESCE(wins.vote_count, 0) AS win_count,
    COALESCE(losses.vote_count, 0) AS loss_count,
    RANK() OVER (PARTITION BY v.poll_id ORDER BY (COALESCE(wins.total_points, 0) - COALESCE(losses.total_points, 0)) DESC) AS rank
FROM options o
CROSS JOIN (SELECT DISTINCT poll_id FROM votes) v
LEFT JOIN (
    SELECT
        winner_id,
        poll_id,
        SUM(conviction_score) AS total_points,
        COUNT(*) AS vote_count
    FROM votes
    GROUP BY winner_id, poll_id
) wins ON o.id = wins.winner_id AND v.poll_id = wins.poll_id
LEFT JOIN (
    SELECT
        loser_id,
        poll_id,
        SUM(conviction_score) AS total_points,
        COUNT(*) AS vote_count
    FROM votes
    GROUP BY loser_id, poll_id
) losses ON o.id = losses.loser_id AND v.poll_id = losses.poll_id
WHERE EXISTS (
    SELECT 1 FROM poll_options po WHERE po.option_id = o.id AND po.poll_id = v.poll_id
)
ORDER BY v.poll_id, net_score DESC;

-- Drop and recreate pair_consensus view to filter by poll
DROP VIEW IF EXISTS pair_consensus;
CREATE OR REPLACE VIEW pair_consensus AS
SELECT
    v.poll_id,
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
GROUP BY v.poll_id, v.pair_hash, o1.name, o2.name, v.winner_id, ow.name
ORDER BY v.poll_id, total_conviction DESC;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on new tables
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_participants ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLLS POLICIES
-- ============================================

-- Everyone can view active polls
CREATE POLICY "Anyone can view active polls"
ON polls FOR SELECT
TO authenticated
USING (is_active = TRUE OR created_by = auth.uid());

-- Admins can create polls
CREATE POLICY "Admins can create polls"
ON polls FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- Admins can update polls
CREATE POLICY "Admins can update polls"
ON polls FOR UPDATE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
)
WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- Admins can delete polls
CREATE POLICY "Admins can delete polls"
ON polls FOR DELETE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- ============================================
-- POLL_OPTIONS POLICIES
-- ============================================

-- Everyone can view poll options
CREATE POLICY "Anyone can view poll options"
ON poll_options FOR SELECT
TO authenticated
USING (true);

-- Admins can manage poll options
CREATE POLICY "Admins can insert poll options"
ON poll_options FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

CREATE POLICY "Admins can delete poll options"
ON poll_options FOR DELETE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- ============================================
-- POLL_PARTICIPANTS POLICIES
-- ============================================

-- Users can view their own participation
CREATE POLICY "Users can view own participation"
ON poll_participants FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all participation
CREATE POLICY "Admins can view all participation"
ON poll_participants FOR SELECT
TO authenticated
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- Users can insert their own participation
CREATE POLICY "Users can insert own participation"
ON poll_participants FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own participation (for anonymity toggle)
CREATE POLICY "Users can update own participation"
ON poll_participants FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- UPDATE VOTES POLICIES
-- ============================================

-- Drop existing insert policy and create updated one
DROP POLICY IF EXISTS "Users can insert own votes" ON votes;
CREATE POLICY "Users can insert own votes"
ON votes FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM polls p WHERE p.id = poll_id AND p.is_active = TRUE
    )
);

-- ============================================
-- GRANT PERMISSIONS ON VIEWS
-- ============================================

GRANT SELECT ON leaderboard TO authenticated;
GRANT SELECT ON pair_consensus TO authenticated;

-- ============================================
-- SET ADMIN USER
-- ============================================

-- Set kenl as admin (update email as needed)
UPDATE profiles
SET is_admin = TRUE
WHERE display_name ILIKE '%kenl%'
   OR id IN (
       SELECT id FROM auth.users WHERE email ILIKE '%kenl%'
   );
