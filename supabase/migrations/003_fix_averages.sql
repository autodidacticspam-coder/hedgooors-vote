-- Fix leaderboard to use averages and pair_consensus to use win %

-- ============================================
-- UPDATE LEADERBOARD VIEW (use averages)
-- ============================================

DROP VIEW IF EXISTS leaderboard;
CREATE OR REPLACE VIEW leaderboard AS
WITH vote_stats AS (
    SELECT
        o.id AS option_id,
        v.poll_id,
        -- Win stats
        COALESCE(SUM(CASE WHEN v.winner_id = o.id THEN v.conviction_score ELSE 0 END), 0) AS total_win_points,
        COUNT(CASE WHEN v.winner_id = o.id THEN 1 END) AS win_count,
        -- Loss stats
        COALESCE(SUM(CASE WHEN v.loser_id = o.id THEN v.conviction_score ELSE 0 END), 0) AS total_loss_points,
        COUNT(CASE WHEN v.loser_id = o.id THEN 1 END) AS loss_count,
        -- Total votes involving this option
        COUNT(CASE WHEN v.winner_id = o.id OR v.loser_id = o.id THEN 1 END) AS total_votes
    FROM options o
    CROSS JOIN (SELECT DISTINCT poll_id FROM votes) p
    LEFT JOIN votes v ON (v.winner_id = o.id OR v.loser_id = o.id) AND v.poll_id = p.poll_id
    WHERE EXISTS (
        SELECT 1 FROM poll_options po WHERE po.option_id = o.id AND po.poll_id = p.poll_id
    )
    GROUP BY o.id, v.poll_id
)
SELECT
    o.id,
    o.name,
    o.description,
    o.image_url,
    vs.poll_id,
    -- Average scores (total points / total votes involving this option)
    CASE WHEN vs.total_votes > 0
        THEN ROUND((vs.total_win_points::numeric / vs.total_votes), 1)
        ELSE 0
    END AS win_points,
    CASE WHEN vs.total_votes > 0
        THEN ROUND((vs.total_loss_points::numeric / vs.total_votes), 1)
        ELSE 0
    END AS loss_points,
    CASE WHEN vs.total_votes > 0
        THEN ROUND(((vs.total_win_points - vs.total_loss_points)::numeric / vs.total_votes), 1)
        ELSE 0
    END AS net_score,
    vs.win_count::integer,
    vs.loss_count::integer,
    RANK() OVER (
        PARTITION BY vs.poll_id
        ORDER BY CASE WHEN vs.total_votes > 0
            THEN (vs.total_win_points - vs.total_loss_points)::numeric / vs.total_votes
            ELSE 0
        END DESC
    ) AS rank
FROM options o
JOIN vote_stats vs ON vs.option_id = o.id
WHERE vs.poll_id IS NOT NULL
ORDER BY vs.poll_id, net_score DESC;

-- ============================================
-- UPDATE PAIR_CONSENSUS VIEW (use win %)
-- ============================================

DROP VIEW IF EXISTS pair_consensus;
CREATE OR REPLACE VIEW pair_consensus AS
WITH pair_totals AS (
    -- Get total votes for each pair
    SELECT
        poll_id,
        pair_hash,
        COUNT(*) AS total_votes,
        AVG(conviction_score) AS avg_conviction,
        SUM(conviction_score) AS total_conviction
    FROM votes
    GROUP BY poll_id, pair_hash
),
pair_winners AS (
    -- Get vote count per winner in each pair
    SELECT
        v.poll_id,
        v.pair_hash,
        v.winner_id,
        COUNT(*) AS winner_votes
    FROM votes v
    GROUP BY v.poll_id, v.pair_hash, v.winner_id
),
dominant_winners AS (
    -- Get the dominant winner for each pair (most votes)
    SELECT DISTINCT ON (poll_id, pair_hash)
        poll_id,
        pair_hash,
        winner_id,
        winner_votes
    FROM pair_winners
    ORDER BY poll_id, pair_hash, winner_votes DESC
)
SELECT
    pt.poll_id,
    pt.pair_hash,
    o1.name AS option_a,
    o2.name AS option_b,
    dw.winner_id,
    ow.name AS winner_name,
    pt.total_votes AS vote_count,
    ROUND(pt.avg_conviction::numeric, 1) AS avg_conviction,
    pt.total_conviction,
    -- Win percentage: winner_votes / total_votes * 100
    ROUND((dw.winner_votes::numeric / pt.total_votes) * 100, 0) AS win_percentage
FROM pair_totals pt
JOIN dominant_winners dw ON pt.poll_id = dw.poll_id AND pt.pair_hash = dw.pair_hash
JOIN votes v ON v.poll_id = pt.poll_id AND v.pair_hash = pt.pair_hash
JOIN options o1 ON o1.id = LEAST(v.winner_id, v.loser_id)
JOIN options o2 ON o2.id = GREATEST(v.winner_id, v.loser_id)
JOIN options ow ON ow.id = dw.winner_id
GROUP BY pt.poll_id, pt.pair_hash, o1.name, o2.name, dw.winner_id, ow.name,
         pt.total_votes, pt.avg_conviction, pt.total_conviction, dw.winner_votes
ORDER BY pt.poll_id, win_percentage DESC, pt.total_conviction DESC;

-- Rename Default Poll to Presidents
UPDATE polls SET title = 'Presidents' WHERE title = 'Default Poll';

-- ============================================
-- GRANT PERMISSIONS ON VIEWS
-- ============================================

GRANT SELECT ON leaderboard TO authenticated;
GRANT SELECT ON pair_consensus TO authenticated;
