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
    res = requests.get(f"{SUPABASE_URL}/rest/v1/tennis_matches", headers=HEADERS)
    if res.status_code == 200:
        data = res.json()
        print(f"Total matches in database: {len(data)}")
        found = 0
        for idx, match in enumerate(data):
            pA = match.get('player_a_name', '').lower()
            pB = match.get('player_b_name', '').lower()
            if 'muller' in pA or 'muller' in pB or 'hartel' in pA or 'hartel' in pB:
                found += 1
                print(f"[{found}] {match.get('player_a_name')} vs {match.get('player_b_name')}")
                print(f"    Tournament: {match.get('tournament')}")
                print(f"    Score string: {match.get('score_str')}")
                print(f"    Is Live: {match.get('is_live')}")
                print(f"    Updated at: {match.get('updated_at')}")
    else:
        print(f"Error fetching matches: {res.status_code} - {res.text}")

if __name__ == "__main__":
    main()
