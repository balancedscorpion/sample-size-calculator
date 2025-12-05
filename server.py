"""
Production server that serves both the FastAPI backend and static frontend.
Used when running in Docker or other containerized environments.
"""

import logging
import os
import sys
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Configure logging to stdout (Railway/cloud platforms treat stderr as errors)
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s:     %(message)s",
    stream=sys.stdout,
)

# Import the existing API app
from app.api import app

# Get the static files directory
STATIC_DIR = Path(__file__).parent / "static"

# Mount static assets if the directory exists (production build)
if STATIC_DIR.exists():
    # Mount the assets directory for JS/CSS bundles
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
    
    # Serve vite.svg if it exists
    vite_svg = STATIC_DIR / "vite.svg"
    if vite_svg.exists():
        @app.get("/vite.svg")
        async def serve_vite_svg():
            return FileResponse(vite_svg)
    
    # Catch-all route for SPA - must be added last
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the SPA for any unmatched routes."""
        # Check if it's a file request
        file_path = STATIC_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        # Otherwise serve index.html for SPA routing
        return FileResponse(STATIC_DIR / "index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    
    # Custom log config to use stdout instead of stderr
    log_config = uvicorn.config.LOGGING_CONFIG
    log_config["handlers"]["default"]["stream"] = "ext://sys.stdout"
    log_config["handlers"]["access"]["stream"] = "ext://sys.stdout"
    
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
        log_config=log_config,
    )

