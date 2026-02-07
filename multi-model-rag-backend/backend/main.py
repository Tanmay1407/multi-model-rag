from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.models.database import connect_to_mongo, connect_to_chroma, close_mongo_connection
from app.routers import upload, pipeline, chat, auth, features


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    await connect_to_mongo()
    await connect_to_chroma()
    print("✅ FastAPI server started successfully")
    yield
    # Shutdown
    await close_mongo_connection()
    print("✅ FastAPI server shutdown complete")


app = FastAPI(
    title="Multi-Modal RAG API",
    description="API for Multi-Modal Retrieval-Augmented Generation with PDF processing",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)  # No prefix, already defined in router
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
app.include_router(pipeline.router, prefix="/api/pipeline", tags=["Pipeline"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(features.router)  # No prefix, already defined in router


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Multi-Modal RAG API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "services": {
            "api": "running",
            "mongodb": "connected"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.api_reload
    )
