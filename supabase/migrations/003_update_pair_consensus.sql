-- Migration: Update pair_consensus view to show net avg and win percentage
-- Net avg = (sum of wins - sum of losses) / total votes
-- Win % = wins / total votes for the dominant option

DROP VIEW IF EXISTS pair_consensus;

CREATE OR REPLACE VIEW pair_consensus AS
WITH pair_stats AS (
    SELECT
        v.pair_hash,
        -- option_a is alphabetically first (by ID)
        LEAST(v.winner_id, v.loser_id) AS option_a_id,
        GREATEST(v.winner_id, v.loser_id) AS option_b_id,
        -- Count wins for option_a (when winner_id = option_a_id)
        COUNT(*) FILTER (WHERE v.winner_id = LEAST(v.winner_id, v.loser_id)) AS option_a_wins,
        -- Count wins for option_b
        COUNT(*) FILTER (WHERE v.winner_id = GREATEST(v.winner_id, v.loser_id)) AS option_b_wins,
        -- Sum conviction when option_a wins
        COALESCE(SUM(v.conviction_score) FILTER (WHERE v.winner_id = LEAST(v.winner_id, v.loser_id)), 0) AS option_a_conviction,
        -- Sum conviction when option_b wins
        COALESCE(SUM(v.conviction_score) FILTER (WHERE v.winner_id = GREATEST(v.winner_id, v.loser_id)), 0) AS option_b_conviction,
        COUNT(*) AS total_votes
    FROM votes v
    GROUP BY v.pair_hash, LEAST(v.winner_id, v.loser_id), GREATEST(v.winner_id, v.loser_id)
)
SELECT
    ps.pair_hash,
    oa.name AS option_a,
    ob.name AS option_b,
    -- Winner is whoever has more wins (ties go to option_a)
    CASE
        WHEN ps.option_a_wins >= ps.option_b_wins THEN ps.option_a_id
        ELSE ps.option_b_id
    END AS winner_id,
    CASE
        WHEN ps.option_a_wins >= ps.option_b_wins THEN oa.name
        ELSE ob.name
    END AS winner_name,
    ps.total_votes AS vote_count,
    -- Net avg conviction from winner's perspective (positive means winner dominated)
    CASE
        WHEN ps.option_a_wins >= ps.option_b_wins
        THEN (ps.option_a_conviction - ps.option_b_conviction)::NUMERIC / NULLIF(ps.total_votes, 0)
        ELSE (ps.option_b_conviction - ps.option_a_conviction)::NUMERIC / NULLIF(ps.total_votes, 0)
    END AS avg_conviction,
    -- Win percentage for the winner
    CASE
        WHEN ps.option_a_wins >= ps.option_b_wins
        THEN ps.option_a_wins::NUMERIC / NULLIF(ps.total_votes, 0) * 100
        ELSE ps.option_b_wins::NUMERIC / NULLIF(ps.total_votes, 0) * 100
    END AS win_pct,
    -- Keep total conviction for sorting (absolute dominance)
    ABS(ps.option_a_conviction - ps.option_b_conviction) AS total_conviction
FROM pair_stats ps
JOIN options oa ON oa.id = ps.option_a_id
JOIN options ob ON ob.id = ps.option_b_id
ORDER BY total_conviction DESC;
