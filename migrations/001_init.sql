CREATE TABLE IF NOT EXISTS players (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(32)  NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
    id          SERIAL PRIMARY KEY,
    player_id   INTEGER      NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    score       INTEGER      NOT NULL CHECK (score >= 0),
    duration_ms INTEGER      NOT NULL CHECK (duration_ms >= 0),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_player_id ON matches(player_id);
CREATE INDEX IF NOT EXISTS idx_matches_score     ON matches(score DESC);

CREATE OR REPLACE VIEW leaderboard AS
SELECT
    p.id              AS player_id,
    p.username,
    MAX(m.score)      AS best_score,
    COUNT(m.id)       AS games_played,
    MAX(m.created_at) AS last_played_at
FROM players p
JOIN matches m ON m.player_id = p.id
GROUP BY p.id, p.username
ORDER BY best_score DESC, last_played_at ASC;
