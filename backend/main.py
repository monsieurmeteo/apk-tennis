from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from kambi_odds_monitor import kambi_stream_generator
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Tennis Quant Edge API")

# Setup CORS for the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Tennis Quant Edge API is running"}

@app.get("/api/stream")
async def stream_live_matches():
    """
    SSE endpoint pushing live and upcoming matches every 3 seconds.
    """
    return EventSourceResponse(kambi_stream_generator())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
