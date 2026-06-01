import requests
import json
import os
from dotenv import load_dotenv

# Charger les variables d'environnement (.env local s'il existe)
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ubdevaemtwbzxksjlhjg.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"
}

def main():
    res = requests.get(f"{SUPABASE_URL}/rest/v1/tennis_matches?is_live=eq.true", headers=HEADERS)
    if res.status_code == 200:
        data = res.json()
        print(f"Total live matches in database: {len(data)}")
        for idx, match in enumerate(data[:15]):
            print(f"[{idx}] {match.get('player_a_name')} vs {match.get('player_b_name')}")
            print(f"    Tournament: {match.get('tournament')}")
            print(f"    Score string: {match.get('score_str')}")
            print(f"    Updated at: {match.get('updated_at')}")
    else:
        print(f"Error fetching matches: {res.status_code} - {res.text}")

if __name__ == "__main__":
    main()
