from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from universal_scraper import scrape_sofascore

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Autorise Vercel à contacter ce serveur
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/matches")
async def get_matches():
    # Appelle le scraper Playwright en temps réel
    matches = scrape_sofascore()
    return {"matches": matches}

# Commande de lancement pour Render:
# pip install -r requirements.txt && playwright install chromium && uvicorn server:app --host 0.0.0.0 --port $PORT
