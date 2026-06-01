from playwright.sync_api import sync_playwright
import json

def scrape_sofascore():
    """
    Lance un navigateur Chrome invisible pour contourner Cloudflare
    et extraire l'intégralité des scores de tennis depuis l'API privée de SofaScore.
    """
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            
            # URL de l'API interne de SofaScore
            url = "https://api.sofascore.com/api/v1/sport/tennis/events/live"
            
            # Navigation classique qui permet d'exécuter le challenge JS de Cloudflare
            page.goto(url, wait_until="domcontentloaded")
            page.wait_for_timeout(2000) # Laisse le temps à Cloudflare de valider
            
            content = page.locator("body").inner_text()
            data = json.loads(content)
            events = data.get('events', [])
            browser.close()
            
            matches = []
            for event in events:
                try:
                    is_live = event.get('status', {}).get('type') == 'inprogress'
                    home_name = event.get('homeTeam', {}).get('name', 'Player A')
                    away_name = event.get('awayTeam', {}).get('name', 'Player B')
                    
                    tournament = event.get('tournament', {}).get('name', 'Tennis Match')
                    
                    # Simulation du calcul IA (Puisqu'on a enlevé les cotes)
                    hash_val = (len(home_name) * 7 + len(away_name) * 13) % 100
                    probA = max(15, min(85, hash_val))
                    probB = 100 - probA
                    edge = abs(probA - 50)
                    
                    score_str = "LIVE" if is_live else "À venir"
                    
                    # Extraction du score SofaScore si disponible
                    try:
                        home_score = event.get('homeScore', {}).get('current', '')
                        away_score = event.get('awayScore', {}).get('current', '')
                        if home_score != '' and away_score != '':
                            score_str = f"{home_score} - {away_score}"
                    except:
                        pass
                    
                    matches.append({
                        "id": str(event.get('id', hash_val)),
                        "tournament": tournament,
                        "is_live": is_live,
                        "score_str": score_str,
                        "playerA": {"name": home_name, "rank": 0, "prob": probA},
                        "playerB": {"name": away_name, "rank": 0, "prob": probB},
                        "edge": edge,
                        "targetPlayer": "A" if probA > probB else "B"
                    })
                except:
                    continue
                    
            # Si SofaScore n'a rien renvoyé (nuit profonde), injecte des matchs de démo
            if len(matches) == 0:
                return get_demo_matches()
                
            # Trie les matchs en direct en premier
            matches.sort(key=lambda x: not x['is_live'])
            return matches

    except Exception as e:
        print("Erreur Playwright Scraper:", e)
        return get_demo_matches()

def get_demo_matches():
    return [
        {
            "id": "mock-1", "tournament": "ATP Roland Garros", "is_live": True, "score_str": "S: 1-0",
            "playerA": {"name": "C. Alcaraz", "rank": 2, "prob": 72},
            "playerB": {"name": "J. Sinner", "rank": 1, "prob": 28},
            "edge": 22, "targetPlayer": "A"
        },
        {
            "id": "mock-2", "tournament": "WTA Roland Garros", "is_live": True, "score_str": "S: 0-0",
            "playerA": {"name": "I. Swiatek", "rank": 1, "prob": 80},
            "playerB": {"name": "A. Sabalenka", "rank": 2, "prob": 20},
            "edge": 30, "targetPlayer": "A"
        }
    ]
