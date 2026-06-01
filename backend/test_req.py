import requests
import warnings
warnings.filterwarnings("ignore", message="Unverified HTTPS request")

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://www.sofascore.com/',
    'Origin': 'https://www.sofascore.com'
}

try:
    url = "https://api.sofascore.com/api/v1/sport/tennis/events/live"
    res = requests.get(url, headers=headers, verify=False)
    print("Status:", res.status_code)
    data = res.json()
    events = data.get('events', [])
    print(f"Total Live Matches: {len(events)}")
    if len(events) > 0:
        match = events[0]
        home = match.get('homeTeam', {}).get('name')
        away = match.get('awayTeam', {}).get('name')
        print(f"First match: {home} vs {away}")
except Exception as e:
    print("Error:", e)
