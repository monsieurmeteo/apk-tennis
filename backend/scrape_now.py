"""
One-shot scrape: Aspire SofaScore et envoie tout dans Supabase.
"""
from playwright.sync_api import sync_playwright
import json, requests
import os
from datetime import datetime, timezone
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

def gen_prob(a, b):
    h = (ord(a[0])*7 + ord(b[0])*13 + len(a)*3 + len(b)*11) % 100
    return max(30, min(70, h))

def parse_event(event, is_live):
    try:
        home = event.get('homeTeam', {}).get('name', 'Player A')
        away = event.get('awayTeam', {}).get('name', 'Player B')
        tournament = event.get('tournament', {}).get('name', 'Tennis')
        category = event.get('tournament', {}).get('category', {}).get('name', '')
        if category:
            tournament = f"{category} - {tournament}"
        
        score_str = "LIVE" if is_live else "À venir"
        if is_live:
            hs = event.get('homeScore', {}).get('current', '')
            as_ = event.get('awayScore', {}).get('current', '')
            if hs != '' and as_ != '':
                score_str = f"{hs} - {as_}"
        else:
            ts = event.get('startTimestamp', 0)
            if ts:
                dt = datetime.utcfromtimestamp(ts)
                score_str = dt.strftime("%d/%m %H:%M")
        
        prob_a = gen_prob(home, away)
        prob_b = 100 - prob_a
        
        return {
            "id": str(event.get('id', f"{home}-{away}")),
            "tournament": tournament,
            "is_live": is_live,
            "score_str": score_str,
            "player_a_name": home,
            "player_a_rank": 0,
            "player_a_prob": prob_a,
            "player_b_name": away,
            "player_b_rank": 0,
            "player_b_prob": prob_b,
            "edge": float(abs(prob_a - 50)),
            "target_player": "A" if prob_a > prob_b else "B",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        print(f"Parse error: {e}")
        return None

def scrape_and_push():
    all_matches = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        
        # 1. LIVE matches
        try:
            print("🔴 Fetching LIVE matches from SofaScore...")
            page.goto("https://api.sofascore.com/api/v1/sport/tennis/events/live", wait_until="domcontentloaded")
            page.wait_for_timeout(2500)
            data = json.loads(page.locator("body").inner_text())
            events = data.get('events', [])
            print(f"   Found {len(events)} live matches")
            for e in events:
                m = parse_event(e, True)
                if m:
                    all_matches.append(m)
        except Exception as ex:
            print(f"   Live error: {ex}")
        
        # 2. SCHEDULED matches today + tomorrow
        today = datetime.utcnow().strftime("%Y-%m-%d")
        from datetime import timedelta
        tomorrow = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        for day in [today, tomorrow]:
            try:
                label = "TODAY" if day == today else "TOMORROW"
                print(f"📅 Fetching {label} scheduled matches ({day})...")
                page.goto(f"https://api.sofascore.com/api/v1/sport/tennis/scheduled-events/{day}", wait_until="domcontentloaded")
                page.wait_for_timeout(2500)
                data = json.loads(page.locator("body").inner_text())
                events = data.get('events', [])
                
                upcoming = [e for e in events if e.get('status', {}).get('type') not in ['inprogress', 'finished']]
                print(f"   Found {len(upcoming)} upcoming matches for {label}")
                for e in upcoming:
                    m = parse_event(e, False)
                    if m and not any(x['id'] == m['id'] for x in all_matches):
                        all_matches.append(m)
            except Exception as ex:
                print(f"   Scheduled {day} error: {ex}")
        
        browser.close()
    
    print(f"\n📊 Total matches to push: {len(all_matches)}")
    
    if all_matches:
        # Push in batches of 50
        for i in range(0, len(all_matches), 50):
            batch = all_matches[i:i+50]
            res = requests.post(
                f"{SUPABASE_URL}/rest/v1/tennis_matches",
                headers=HEADERS,
                json=batch
            )
            if res.status_code in [200, 201]:
                print(f"✅ Batch {i//50+1}: {len(batch)} matches pushed to Supabase!")
            else:
                print(f"❌ Batch error: {res.status_code} - {res.text[:200]}")
    
    return len(all_matches)

if __name__ == "__main__":
    count = scrape_and_push()
    print(f"\n🎾 Done! {count} matches now in Supabase.")
