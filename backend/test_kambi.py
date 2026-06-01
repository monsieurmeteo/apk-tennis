import aiohttp
import asyncio
import json

ESPN_TENNIS_URL = "https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard"

async def fetch():
    headers = {'User-Agent': 'Mozilla/5.0'}
    async with aiohttp.ClientSession(headers=headers) as session:
        async with session.get(ESPN_TENNIS_URL) as response:
            print("Status:", response.status)
            try:
                data = await response.json()
                events = data.get('events', [])
                print("Total events:", len(events))
                if events:
                    matches = events[0].get('competitions', [])
                    print("Total matches:", len(matches))
                    if matches:
                        print("First match:", matches[0].get('name'))
            except Exception as e:
                print("JSON Error:", e)

if __name__ == "__main__":
    asyncio.run(fetch())
