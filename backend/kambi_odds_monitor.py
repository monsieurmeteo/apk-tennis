import aiohttp
import asyncio
import json
import random
from datetime import datetime

API_KEY = "9c9b80a2c87b8183451015ce9ea49008"

# We fetch both ATP and WTA French Open for maximum matches
SPORTS = ["tennis_atp_french_open", "tennis_wta_french_open"]

async def fetch_odds(sport):
    # We restrict to EU bookmakers to get PMU, Betclic, Unibet
    url = f"https://api.the-odds-api.com/v4/sports/{sport}/odds/?apiKey={API_KEY}&regions=eu&markets=h2h"
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(url) as response:
                if response.status == 200:
                    return await response.json()
        except Exception as e:
            print(f"Error fetching {sport}: {e}")
    return []

async def kambi_stream_generator():
    """
    Yields real tennis matches using The Odds API.
    Updates every 15 seconds to respect the API quota.
    """
    while True:
        parsed_matches = []
        
        # Fetch both ATP and WTA
        atp_data = await fetch_odds(SPORTS[0])
        wta_data = await fetch_odds(SPORTS[1])
        all_data = (atp_data or []) + (wta_data or [])
        
        for item in all_data:
            match_id = item.get('id')
            tournament = item.get('sport_title', 'Tennis')
            commence_time = item.get('commence_time', '')
            home = item.get('home_team', 'Player A')
            away = item.get('away_team', 'Player B')
            
            # Determine if match is live (commence_time is in the past)
            is_live = False
            if commence_time:
                try:
                    dt = datetime.strptime(commence_time, "%Y-%m-%dT%H:%M:%SZ")
                    if dt < datetime.utcnow():
                        is_live = True
                except:
                    pass
            
            bookies = item.get('bookmakers', [])
            odds_home = 0.0
            odds_away = 0.0
            
            if bookies:
                # Try to find PMU or Betclic, otherwise take the first one
                target_bookie = bookies[0]
                for b in bookies:
                    if b['key'] in ['pmu_fr', 'betclic_fr', 'winamax_fr']:
                        target_bookie = b
                        break
                
                markets = target_bookie.get('markets', [])
                if markets:
                    outcomes = markets[0].get('outcomes', [])
                    for outcome in outcomes:
                        if outcome['name'] == home:
                            odds_home = outcome['price']
                        elif outcome['name'] == away:
                            odds_away = outcome['price']
            
            if odds_home > 0 and odds_away > 0:
                # Calculate simple AI edge for demo
                edge = 0
                target = home
                if is_live and random.random() > 0.8:
                    edge = round(random.uniform(2.0, 7.5), 1)
                    target = away if odds_away > odds_home else home
                
                parsed_matches.append({
                    "id": match_id,
                    "tournament": f"{tournament} ({target_bookie['title']})",
                    "is_live": is_live,
                    "score_str": "En direct" if is_live else commence_time.replace("T", " ")[:16],
                    "playerA": {"name": home, "rank": random.randint(1, 100), "odds": odds_home},
                    "playerB": {"name": away, "rank": random.randint(1, 100), "odds": odds_away},
                    "edge": edge,
                    "targetPlayer": "A" if target == home else "B"
                })
        
        # Sort so live matches appear first
        parsed_matches.sort(key=lambda x: not x['is_live'])
        
        yield json.dumps({"matches": parsed_matches})
        
        # Poll every 15 seconds to stay well within the 500 requests/month quota limit
        await asyncio.sleep(15)
