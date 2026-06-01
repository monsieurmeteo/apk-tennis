import cloudscraper
import json

scraper = cloudscraper.create_scraper()
url = "https://api.sofascore.com/api/v1/sport/tennis/events/live"
res = scraper.get(url)

print("Status:", res.status_code)
if res.status_code == 200:
    data = res.json()
    events = data.get('events', [])
    print("Total Live Matches:", len(events))
else:
    print("Failed to bypass Cloudflare. Response:", res.text[:200])
