import aiohttp
import asyncio
import json

SOFA_URL = "https://api.sofascore.com/api/v1/sport/tennis/events/live"

async def fetch():
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json'
    }
    async with aiohttp.ClientSession(headers=headers) as session:
        async with session.get(SOFA_URL) as response:
            print("Status:", response.status)
            try:
                data = await response.json()
                events = data.get('events', [])
                print("Total Live Matches:", len(events))
                if events:
                    print("First match:", events[0].get('homeTeam', {}).get('name'), "vs", events[0].get('awayTeam', {}).get('name'))
            except Exception as e:
                print("JSON Error:", e)

if __name__ == "__main__":
    asyncio.run(fetch())
