-- Fix pair_consensus to show net average across all votes in a matchup
-- If A beats B with +8 and B beats A with +6, net avg for A = (8-6)/2 = +1

DROP VIEW IF EXISTS pair_consensus;

CREATE OR REPLACE VIEW pair_consensus AS
WITH pair_votes AS (
    SELECT
        v.poll_id,
        v.pair_hash,
        LEAST(v.winner_id, v.loser_id) AS option_a_id,
        GREATEST(v.winner_id, v.loser_id) AS option_b_id,
        -- Score from option_a's perspective: positive when A wins, negative when A loses
        CASE
            WHEN v.winner_id = LEAST(v.winner_id, v.loser_id) THEN v.conviction_score
            ELSE -v.conviction_score
        END AS score_for_a,
        v.conviction_score
    FROM votes v
),
pair_aggregates AS (
    SELECT
        poll_id,
        pair_hash,
        option_a_id,
        option_b_id,
        SUM(score_for_a) AS net_score_for_a,
        COUNT(*) AS vote_count,
        AVG(conviction_score) AS raw_avg_conviction
    FROM pair_votes
    GROUP BY poll_id, pair_hash, option_a_id, option_b_id
)
SELECT
    pa.poll_id,
    pa.pair_hash,
    oa.name AS option_a,
    ob.name AS option_b,
    -- Winner is determined by net score
    CASE WHEN pa.net_score_for_a >= 0 THEN pa.option_a_id ELSE pa.option_b_id END AS winner_id,
    CASE WHEN pa.net_score_for_a >= 0 THEN oa.name ELSE ob.name END AS winner_name,
    pa.vote_count,
    -- Net average from winner's perspective (always positive or zero)
    ROUND(ABS(pa.net_score_for_a)::NUMERIC / pa.vote_count, 1) AS avg_conviction,
    ABS(pa.net_score_for_a) AS total_conviction,
    -- Win percentage: votes where winner won / total votes
    ROUND(
        (CASE
            WHEN pa.net_score_for_a >= 0
            THEN (SELECT COUNT(*) FROM pair_votes pv WHERE pv.pair_hash = pa.pair_hash AND pv.poll_id = pa.poll_id AND pv.score_for_a > 0)
            ELSE (SELECT COUNT(*) FROM pair_votes pv WHERE pv.pair_hash = pa.pair_hash AND pv.poll_id = pa.poll_id AND pv.score_for_a < 0)
        END)::NUMERIC / pa.vote_count * 100, 0
    ) AS win_percentage
FROM pair_aggregates pa
JOIN options oa ON oa.id = pa.option_a_id
JOIN options ob ON ob.id = pa.option_b_id
ORDER BY pa.poll_id, ABS(pa.net_score_for_a) DESC;

GRANT SELECT ON pair_consensus TO authenticated;
