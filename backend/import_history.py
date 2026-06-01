"""
Télécharge et importe les données historiques Jeff Sackmann (ATP + WTA)
dans la table tennis_history de Supabase.
On importe les 5 dernières années pour avoir un H2H et des stats fiables.
"""
import requests
import csv
import io
import json
from datetime import datetime

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

YEARS = [2021, 2022, 2023, 2024, 2025]
TOURS = {
    "atp": "https://raw.githubusercontent.com/JeffSackmann/tennis_atp/master/atp_matches_{year}.csv",
    "wta": "https://raw.githubusercontent.com/JeffSackmann/tennis_wta/master/wta_matches_{year}.csv"
}

def download_csv(url):
    try:
        res = requests.get(url, timeout=15)
        if res.status_code == 200:
            return list(csv.DictReader(io.StringIO(res.text)))
        print(f"  HTTP {res.status_code} for {url}")
        return []
    except Exception as e:
        print(f"  Error: {e}")
        return []

def parse_row(row, tour):
    try:
        return {
            "match_id": f"{tour}-{row.get('tourney_id','')}-{row.get('match_num','')}",
            "tour": tour.upper(),
            "tourney_name": row.get('tourney_name', ''),
            "surface": row.get('surface', ''),
            "tourney_date": row.get('tourney_date', '')[:8] if row.get('tourney_date') else None,
            "winner_name": row.get('winner_name', ''),
            "loser_name": row.get('loser_name', ''),
            "score": row.get('score', ''),
            "round": row.get('round', ''),
            # Stats vainqueur
            "w_aces": int(row['w_ace']) if row.get('w_ace','').isdigit() else None,
            "w_df": int(row['w_df']) if row.get('w_df','').isdigit() else None,
            "w_1st_pct": round(int(row['w_1stIn'])/int(row['w_svpt'])*100, 1) if row.get('w_1stIn','').isdigit() and row.get('w_svpt','').isdigit() and int(row.get('w_svpt','0')) > 0 else None,
            # Stats perdant
            "l_aces": int(row['l_ace']) if row.get('l_ace','').isdigit() else None,
            "l_df": int(row['l_df']) if row.get('l_df','').isdigit() else None,
            "l_1st_pct": round(int(row['l_1stIn'])/int(row['l_svpt'])*100, 1) if row.get('l_1stIn','').isdigit() and row.get('l_svpt','').isdigit() and int(row.get('l_svpt','0')) > 0 else None,
        }
    except Exception as e:
        return None

def upsert_batch(batch):
    res = requests.post(
        f"{SUPABASE_URL}/rest/v1/tennis_history",
        headers=HEADERS,
        json=batch
    )
    return res.status_code in [200, 201]

def main():
    total = 0
    for tour, url_template in TOURS.items():
        for year in YEARS:
            url = url_template.format(year=year)
            print(f"\n📥 Downloading {tour.upper()} {year}...")
            rows = download_csv(url)
            if not rows:
                print(f"  ⚠️ No data for {tour} {year}")
                continue
            
            print(f"  Found {len(rows)} matches")
            parsed = [r for r in (parse_row(row, tour) for row in rows) if r]
            
            # Upsert in batches of 200
            ok = 0
            for i in range(0, len(parsed), 200):
                batch = parsed[i:i+200]
                if upsert_batch(batch):
                    ok += len(batch)
            
            print(f"  ✅ {ok}/{len(parsed)} inserted")
            total += ok
    
    print(f"\n🎾 TOTAL: {total} historical matches imported into Supabase!")

if __name__ == "__main__":
    main()
