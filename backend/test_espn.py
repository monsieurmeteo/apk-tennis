import urllib.request
import json

URLS = {
    "ATP": "https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard",
    "WTA": "https://site.api.espn.com/apis/site/v2/sports/tennis/wta/scoreboard"
}

for name, url in URLS.items():
    print(f"\n--- Testing ESPN {name} API ---")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            events = data.get('events', [])
            print(f"Status: 200 OK")
            print(f"Total Events (Tournaments/Matches) returned: {len(events)}")
            
            if len(events) > 0:
                print("First event name:", events[0].get('name', 'Unknown'))
                comps = events[0].get('competitions', [])
                if len(comps) > 0:
                    status = comps[0].get('status', {}).get('type', {}).get('description', 'Unknown')
                    print(f"Match status: {status}")
            else:
                print("L'API a répondu correctement, mais la liste 'events' est complètement vide actuellement.")
                
    except Exception as e:
        print(f"Error calling {name} API:", e)
