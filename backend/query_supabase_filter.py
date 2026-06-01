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
    # Use OR to search in both player_a_name and player_b_name, case-insensitive
    url = f"{SUPABASE_URL}/rest/v1/tennis_matches?or=(player_a_name.ilike.*muller*,player_b_name.ilike.*muller*,player_a_name.ilike.*hartel*,player_b_name.ilike.*hartel*)"
    res = requests.get(url, headers=HEADERS)
    if res.status_code == 200:
        data = res.json()
        print(f"Matches matching filter: {len(data)}")
        for idx, match in enumerate(data):
            print(f"[{idx}] {match.get('player_a_name')} vs {match.get('player_b_name')}")
            print(f"    Tournament: {match.get('tournament')}")
            print(f"    Score string: {match.get('score_str')}")
            print(f"    Is Live: {match.get('is_live')}")
            print(f"    Updated at: {match.get('updated_at')}")
    else:
        print(f"Error: {res.status_code} - {res.text}")

if __name__ == "__main__":
    main()
