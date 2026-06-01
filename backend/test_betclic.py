import aiohttp
import asyncio
import json

# Betclic API for Tennis (Sport ID = 2)
BETCLIC_URL = "https://offer.betclic.fr/api/pub/v2/sports/2?application=2&countrycode=fr&language=fr&sitecode=frfr"

async def fetch():
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json'
    }
    async with aiohttp.ClientSession(headers=headers) as session:
        async with session.get(BETCLIC_URL) as response:
            print("Status:", response.status)
            try:
                data = await response.json()
                competitions = data.get('competitions', [])
                total_matches = 0
                print("Competitions found:", len(competitions))
                for comp in competitions:
                    matches = comp.get('matches', [])
                    total_matches += len(matches)
                print("Total matches found:", total_matches)
                
                if total_matches > 0:
                    first_match = competitions[0]['matches'][0]
                    print("First Match:", first_match.get('name'))
                    print("Is Live:", first_match.get('isLive'))
                    print("Live Data:", first_match.get('liveData'))
            except Exception as e:
                print("JSON Error:", e)

if __name__ == "__main__":
    asyncio.run(fetch())
