import requests
import os
from dotenv import load_dotenv

# Charger les variables d'environnement (.env local s'il existe)
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ubdevaemtwbzxksjlhjg.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json"
}

SQL = """
CREATE TABLE IF NOT EXISTS tennis_matches (
  id TEXT PRIMARY KEY,
  tournament TEXT NOT NULL DEFAULT '',
  is_live BOOLEAN DEFAULT FALSE,
  score_str TEXT DEFAULT 'À venir',
  player_a_name TEXT NOT NULL DEFAULT '',
  player_a_rank INT DEFAULT 0,
  player_a_prob INT DEFAULT 50,
  player_b_name TEXT NOT NULL DEFAULT '',
  player_b_rank INT DEFAULT 0,
  player_b_prob INT DEFAULT 50,
  edge FLOAT DEFAULT 0,
  target_player TEXT DEFAULT 'A',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tennis_matches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tennis_matches' AND policyname='Lecture publique') THEN
    CREATE POLICY "Lecture publique" ON tennis_matches FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tennis_matches' AND policyname='Service role peut tout faire') THEN
    CREATE POLICY "Service role peut tout faire" ON tennis_matches FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
"""

print("Creating tennis_matches table in Supabase...")
res = requests.post(
    f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
    headers=HEADERS,
    json={"sql": SQL}
)
print(f"RPC Status: {res.status_code} - {res.text[:200]}")

# Alternative: Use the management API
print("\nTrying Management API...")
import json

# Try direct SQL via Postgres endpoint
res2 = requests.post(
    f"{SUPABASE_URL}/rest/v1/",
    headers={**HEADERS, "Content-Type": "application/sql"},
    data=SQL
)
print(f"Direct SQL Status: {res2.status_code} - {res2.text[:200]}")
