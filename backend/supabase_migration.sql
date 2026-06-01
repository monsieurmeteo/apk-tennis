-- Table pour stocker tous les matchs de tennis en direct et à venir
CREATE TABLE IF NOT EXISTS tennis_matches (
  id TEXT PRIMARY KEY,
  tournament TEXT NOT NULL,
  is_live BOOLEAN DEFAULT FALSE,
  score_str TEXT DEFAULT 'À venir',
  player_a_name TEXT NOT NULL,
  player_a_rank INT DEFAULT 0,
  player_a_prob INT DEFAULT 50,
  player_b_name TEXT NOT NULL,
  player_b_rank INT DEFAULT 0,
  player_b_prob INT DEFAULT 50,
  edge FLOAT DEFAULT 0,
  target_player TEXT DEFAULT 'A',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active le temps réel sur cette table
ALTER TABLE tennis_matches REPLICA IDENTITY FULL;

-- Accès public en lecture (pour l'appli Vercel)
ALTER TABLE tennis_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique"
ON tennis_matches FOR SELECT
TO anon
USING (true);

CREATE POLICY "Service role peut tout faire"
ON tennis_matches FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
