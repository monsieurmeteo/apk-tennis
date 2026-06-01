import aiohttp
import asyncio
import json

API_KEY = "9c9b80a2c87b8183451015ce9ea49008"
SPORTS_URL = f"https://api.the-odds-api.com/v4/sports/?apiKey={API_KEY}"

ODDS_URL = f"https://api.the-odds-api.com/v4/sports/tennis_atp_french_open/odds/?apiKey={API_KEY}&regions=eu&markets=h2h"

async def fetch():
    async with aiohttp.ClientSession() as session:
        async with session.get(ODDS_URL) as response:
            data = await response.json()
            if data and isinstance(data, list):
                print(f"Total Matches in ATP French Open: {len(data)}")
                if len(data) > 0:
                    print("First match:", json.dumps(data[0], indent=2))
            else:
                print("Error or rate limit:", data)

if __name__ == "__main__":
    asyncio.run(fetch())
