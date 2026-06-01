"""Test: Create the table in Supabase and run one scrape cycle."""
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
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

# Test: Insert demo data to verify connection
test_matches = [
    {
        "id": "test-alcaraz-sinner",
        "tournament": "Roland Garros ATP",
        "is_live": True,
        "score_str": "6-3, 4-2",
        "player_a_name": "C. Alcaraz",
        "player_a_rank": 2,
        "player_a_prob": 68,
        "player_b_name": "J. Sinner",
        "player_b_rank": 1,
        "player_b_prob": 32,
        "edge": 18.0,
        "target_player": "A"
    },
    {
        "id": "test-swiatek-sabalenka",
        "tournament": "Roland Garros WTA",
        "is_live": True,
        "score_str": "7-5, 3-1",
        "player_a_name": "I. Swiatek",
        "player_a_rank": 1,
        "player_a_prob": 75,
        "player_b_name": "A. Sabalenka",
        "player_b_rank": 2,
        "player_b_prob": 25,
        "edge": 25.0,
        "target_player": "A"
    }
]

print("Testing Supabase connection...")
res = requests.post(
    f"{SUPABASE_URL}/rest/v1/tennis_matches",
    headers=HEADERS,
    json=test_matches
)

print(f"Status: {res.status_code}")
if res.status_code in [200, 201]:
    print("✅ Data inserted successfully!")
else:
    print(f"❌ Error: {res.text[:500]}")

# Read it back
res2 = requests.get(
    f"{SUPABASE_URL}/rest/v1/tennis_matches?select=*",
    headers=HEADERS
)
data = res2.json()
print(f"Total rows in Supabase: {len(data)}")
if data:
    print(f"First match: {data[0].get('player_a_name')} vs {data[0].get('player_b_name')}")
