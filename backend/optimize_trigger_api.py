import requests
import json
import os
from dotenv import load_dotenv

# Charger les variables d'environnement (.env local s'il existe)
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json"
}

SQL = """
-- 1. Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trg_calculate_match_stats ON tennis_matches;

-- 2. Créer le trigger optimisé avec la clause WHEN
CREATE TRIGGER trg_calculate_match_stats
BEFORE INSERT OR UPDATE ON tennis_matches
FOR EACH ROW
WHEN (
  OLD IS NULL 
  OR OLD.player_a_name IS DISTINCT FROM NEW.player_a_name 
  OR OLD.player_b_name IS DISTINCT FROM NEW.player_b_name
)
EXECUTE FUNCTION calculate_match_stats();
"""

def main():
    print("🚀 Optimisation du trigger via l'API RPC de Supabase...")
    res = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        headers=HEADERS,
        json={"sql": SQL}
    )
    print(f"Status: {res.status_code}")
    if res.status_code in [200, 201]:
        print("✅ Trigger optimisé avec succès via l'API RPC !")
    else:
        print(f"❌ Erreur : {res.text}")

if __name__ == "__main__":
    main()
