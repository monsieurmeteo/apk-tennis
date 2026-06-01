import requests
import json
import time
import os
from dotenv import load_dotenv

# Charger les variables d'environnement (.env local s'il existe)
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ubdevaemtwbzxksjlhjg.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

def main():
    # Load the kambi_test.json or mock matches to push
    # Let's create some dummy matches to test pushing in batches of 10
    test_matches = []
    for i in range(35):
        test_matches.append({
            "id": f"batch-test-{i}",
            "tournament": "ITF W15 Osijek Women",
            "is_live": True,
            "score_str": "6-3, 2-1",
            "player_a_name": f"Test Player A {i}",
            "player_a_rank": 100 + i,
            "player_a_prob": 50,
            "player_b_name": f"Test Player B {i}",
            "player_b_rank": 200 + i,
            "player_b_prob": 50,
            "edge": 0.0,
            "target_player": "A"
        })
        
    print(f"Testing pushing {len(test_matches)} matches in batches of 10...")
    chunk_size = 10
    success = 0
    
    for i in range(0, len(test_matches), chunk_size):
        chunk = test_matches[i:i+chunk_size]
        print(f"  Sending batch {i//chunk_size + 1} ({len(chunk)} matches)...")
        start = time.time()
        try:
            res = requests.post(
                f"{SUPABASE_URL}/rest/v1/tennis_matches",
                headers=HEADERS,
                json=chunk,
                timeout=15
            )
            elapsed = time.time() - start
            if res.status_code in [200, 201]:
                print(f"  ✅ Batch {i//chunk_size + 1} succeeded in {elapsed:.2f}s")
                success += len(chunk)
            else:
                print(f"  ❌ Batch {i//chunk_size + 1} failed in {elapsed:.2f}s: {res.status_code} - {res.text[:200]}")
        except Exception as e:
            print(f"  ❌ Batch {i//chunk_size + 1} exception: {e}")
            
    print(f"Result: {success}/{len(test_matches)} matches pushed successfully!")

if __name__ == "__main__":
    main()
