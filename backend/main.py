"""FastAPI WebSocket relay server using OpenAI Realtime Agents SDK.

This is the main orchestration module that ties together:
- API routes and WebSocket endpoints (from api package)
- Agent configuration (from agent_config package)
- Application configuration (from config module)
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import Config
from api.websocket import websocket_endpoint

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Realtime Voice Agent API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[Config.FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "model": Config.MODEL,
        "voice": Config.VOICE
    }


# Register WebSocket endpoint
app.add_websocket_route("/ws", websocket_endpoint)


if __name__ == "__main__":
    import uvicorn

    logger.info(f"Starting server on {Config.HOST}:{Config.PORT}")
    logger.info(f"Model: {Config.MODEL}, Voice: {Config.VOICE}")

    uvicorn.run(
        "main:app",
        host=Config.HOST,
        port=Config.PORT,
        reload=True,
        log_level="info"
    )
