# ============================================================================
# Main Application - Parking Service Entry Point
# ============================================================================

# parking-management-system/services/parking-service/src/main.py

import asyncio
import logging
import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.openapi.utils import get_openapi
from starlette.middleware.base import BaseHTTPMiddleware

from src.api.v1 import router as v1_router
from src.core.config import settings
from src.core.logging import setup_logging, get_logger
from src.core.database import engine, SessionLocal, init_db
from src.core.redis import redis_client
from src.core.cache import cache
from src.core.middleware import (
    RequestLoggingMiddleware,
    RateLimitMiddleware,
    TimingMiddleware,
)
from src.exceptions import (
    ParkingException,
    ParkingNotFoundError,
    ValidationError,
    DatabaseError,
    ExternalServiceError,
)
from src.models import Base
from src.services.monitoring import monitoring_service

# Setup logging
logger = setup_logging()

# ============================================================================
# Lifespan Context Manager
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """
    Lifespan context manager for startup and shutdown events
    """
    # Startup
    logger.info(f"Starting {settings.SERVICE_NAME} v{settings.VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    
    try:
        # Initialize database
        logger.info("Initializing database connection...")
        await init_db()
        logger.info("Database connection established")
        
        # Initialize Redis
        logger.info("Initializing Redis connection...")
        await redis_client.initialize()
        logger.info("Redis connection established")
        
        # Initialize cache
        logger.info("Initializing cache...")
        await cache.initialize()
        logger.info("Cache initialized")
        
        # Start monitoring
        logger.info("Starting monitoring service...")
        await monitoring_service.start()
        logger.info("Monitoring service started")
        
        yield
        
    except Exception as e:
        logger.error(f"Startup failed: {str(e)}")
        raise
    finally:
        # Shutdown
        logger.info("Shutting down parking service...")
        
        # Close Redis connection
        await redis_client.close()
        
        # Close database connection
        await engine.dispose()
        
        # Stop monitoring
        await monitoring_service.stop()
        
        logger.info("Shutdown complete")

# ============================================================================
# Create FastAPI Application
# ============================================================================

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Parking Service Microservice for Parking Management System",
    docs_url="/api/docs" if settings.DOCS_ENABLED else None,
    redoc_url="/api/redoc" if settings.DOCS_ENABLED else None,
    openapi_url="/api/openapi.json" if settings.DOCS_ENABLED else None,
    lifespan=lifespan,
)

# ============================================================================
# Custom OpenAPI Schema
# ============================================================================

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=settings.APP_NAME,
        version=settings.VERSION,
        description="Parking Service Microservice API",
        routes=app.routes,
    )
    
    # Add security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    
    # Add global security requirement
    openapi_schema["security"] = [{"BearerAuth": []}]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# ============================================================================
# Middleware Configuration
# ============================================================================

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Processing-Time"],
    max_age=86400,
)

# Trusted host middleware
if settings.TRUSTED_HOSTS:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.TRUSTED_HOSTS,
    )

# Custom middleware
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(TimingMiddleware)

# Rate limiting middleware
if settings.RATE_LIMIT_ENABLED:
    app.add_middleware(
        RateLimitMiddleware,
        requests_per_minute=settings.RATE_LIMIT_REQUESTS,
    )

# ============================================================================
# Exception Handlers
# ============================================================================

@app.exception_handler(ParkingException)
async def parking_exception_handler(request: Request, exc: ParkingException):
    """Handle custom parking exceptions"""
    logger.error(f"Parking exception: {exc.message}", extra={
        "error_code": exc.error_code,
        "status_code": exc.status_code,
        "path": request.url.path,
    })
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "details": exc.details,
            },
            "timestamp": exc.timestamp.isoformat(),
        },
    )

@app.exception_handler(ParkingNotFoundError)
async def not_found_handler(request: Request, exc: ParkingNotFoundError):
    """Handle not found errors"""
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": exc.message,
                "resource": exc.resource,
                "resource_id": exc.resource_id,
            },
            "timestamp": exc.timestamp.isoformat(),
        },
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
        })
    
    logger.warning(f"Validation error: {errors}", extra={
        "path": request.url.path,
        "method": request.method,
    })
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "errors": errors,
            },
        },
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unhandled exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True, extra={
        "path": request.url.path,
        "method": request.method,
    })
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred",
            },
        },
    )

# ============================================================================
# Health Check Endpoint
# ============================================================================

@app.get("/health", tags=["health"])
async def health_check():
    """
    Health check endpoint for service health monitoring
    """
    health_status = {
        "status": "healthy",
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": asyncio.get_event_loop().time(),
    }
    
    # Check database connection
    try:
        db_status = await check_database_health()
        health_status["database"] = db_status
    except Exception as e:
        health_status["database"] = {"status": "unhealthy", "error": str(e)}
        health_status["status"] = "degraded"
    
    # Check Redis connection
    try:
        redis_status = await check_redis_health()
        health_status["redis"] = redis_status
    except Exception as e:
        health_status["redis"] = {"status": "unhealthy", "error": str(e)}
        health_status["status"] = "degraded"
    
    # Check external services
    if settings.ENVIRONMENT != "development":
        external_status = await check_external_services()
        health_status["external_services"] = external_status
    
    return JSONResponse(
        status_code=status.HTTP_200_OK if health_status["status"] == "healthy" else status.HTTP_503_SERVICE_UNAVAILABLE,
        content=health_status,
    )

async def check_database_health():
    """Check database health"""
    try:
        from sqlalchemy import text
        async with SessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "healthy", "latency": "OK"}
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        return {"status": "unhealthy", "error": str(e)}

async def check_redis_health():
    """Check Redis health"""
    try:
        await redis_client.ping()
        return {"status": "healthy", "latency": "OK"}
    except Exception as e:
        logger.error(f"Redis health check failed: {str(e)}")
        return {"status": "unhealthy", "error": str(e)}

async def check_external_services():
    """Check external service health"""
    services = {}
    # Example: Check Google Maps API
    if settings.GOOGLE_MAPS_API_KEY:
        try:
            # Check with a simple request
            services["google_maps"] = {"status": "healthy"}
        except Exception as e:
            services["google_maps"] = {"status": "unhealthy", "error": str(e)}
    
    return services

# ============================================================================
# Readiness Check Endpoint
# ============================================================================

@app.get("/ready", tags=["health"])
async def readiness_check():
    """
    Readiness check for Kubernetes readiness probe
    """
    # Check if service is ready to accept traffic
    # Verify all dependencies are available
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "status": "ready",
            "service": settings.SERVICE_NAME,
        },
    )

# ============================================================================
# Metrics Endpoint
# ============================================================================

@app.get("/metrics", tags=["monitoring"])
async def get_metrics():
    """
    Metrics endpoint for Prometheus monitoring
    """
    from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
    
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )

# ============================================================================
# Info Endpoint
# ============================================================================

@app.get("/info", tags=["info"])
async def get_service_info():
    """
    Get service information
    """
    return {
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "api_version": settings.API_VERSION,
        "features": {
            "rate_limiting": settings.RATE_LIMIT_ENABLED,
            "caching": settings.CACHE_ENABLED,
            "monitoring": settings.MONITORING_ENABLED,
            "geolocation": True,
        },
        "dependencies": {
            "database": "PostgreSQL",
            "cache": "Redis",
            "message_broker": "Redis",
        },
    }

# ============================================================================
# Include Routers
# ============================================================================

app.include_router(v1_router, prefix="/api/v1")

# ============================================================================
# WebSocket Handlers (if needed)
# ============================================================================

from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)
    
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.send_personal_message(f"Message received: {data}", websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast(f"Client disconnected")

# ============================================================================
# Main Entry Point
# ============================================================================

def main():
    """Main entry point for the application"""
    try:
        import uvicorn
        uvicorn.run(
            "src.main:app",
            host=settings.HOST,
            port=settings.PORT,
            reload=settings.DEBUG,
            log_level=settings.LOG_LEVEL.lower(),
            workers=settings.WORKERS,
            proxy_headers=True,
            forwarded_allow_ips="*",
        )
    except KeyboardInterrupt:
        logger.info("Shutting down parking service...")
    except Exception as e:
        logger.error(f"Failed to start parking service: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()