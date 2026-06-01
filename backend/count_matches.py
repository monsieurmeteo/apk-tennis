import requests
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
    res = requests.get(f"{SUPABASE_URL}/rest/v1/tennis_matches?select=count", headers=HEADERS)
    print("Response Status:", res.status_code)
    print("Count:", res.json() if res.status_code == 200 else res.text)
    
    # Query when the latest match was updated
    res2 = requests.get(f"{SUPABASE_URL}/rest/v1/tennis_matches?select=updated_at&order=updated_at.desc&limit=1", headers=HEADERS)
    if res2.status_code == 200 and res2.json():
        print("Latest update in DB:", res2.json()[0].get("updated_at"))

if __name__ == "__main__":
    main()
