"""
Direct PostgreSQL connection to create the tennis_matches table.
"""
import subprocess
import sys
import os
from dotenv import load_dotenv

# Charger les variables d'environnement (.env local s'il existe)
load_dotenv()

# Install psycopg2 if not already installed
try:
    import psycopg2
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
    import psycopg2

SUPABASE_DB_URL = os.getenv("DATABASE_URL")

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
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='tennis_matches' AND policyname='Lecture publique'
  ) THEN
    CREATE POLICY "Lecture publique" ON tennis_matches FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='tennis_matches' AND policyname='Service role peut tout faire'
  ) THEN
    CREATE POLICY "Service role peut tout faire" ON tennis_matches FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
"""

try:
    print("Connecting to Supabase PostgreSQL...")
    conn = psycopg2.connect(SUPABASE_DB_URL, connect_timeout=10)
    cur = conn.cursor()
    
    print("Creating tennis_matches table...")
    cur.execute(SQL)
    conn.commit()
    
    # Verify
    cur.execute("SELECT COUNT(*) FROM tennis_matches;")
    count = cur.fetchone()[0]
    print(f"✅ Table created successfully! Current rows: {count}")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Error: {e}")
    print("\nPlease create the table manually in Supabase SQL Editor:")
    print("https://supabase.com/dashboard/project/ubdevaemtwbzxksjlhjg/sql")
