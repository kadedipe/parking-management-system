# ============================================================================
# Database Module - Database Connection and Session Management
# ============================================================================

# parking-management-system/services/parking-service/src/core/database.py

from typing import AsyncGenerator, Optional
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    AsyncEngine,
    create_async_engine,
    async_sessionmaker,
    AsyncConnection,
)
from sqlalchemy.orm import declarative_base
from sqlalchemy import MetaData, text
from sqlalchemy.pool import NullPool, AsyncAdaptedQueuePool

from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)

# Create metadata with naming convention for migrations
metadata = MetaData(
    naming_convention={
        "ix": "ix_%(column_0_label)s",
        "uq": "uq_%(table_name)s_%(column_0_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s",
    }
)

# Create base model class
Base = declarative_base(metadata=metadata)

# Create async engine
engine: Optional[AsyncEngine] = None
async_session_maker: Optional[async_sessionmaker] = None

def create_engine() -> AsyncEngine:
    """Create async database engine"""
    return create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DB_ECHO,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_pre_ping=True,
        pool_recycle=3600,
        poolclass=AsyncAdaptedQueuePool,
        connect_args={
            "command_timeout": 30,
            "server_settings": {
                "application_name": settings.SERVICE_NAME,
                "timezone": "UTC",
            },
        },
    )

def create_session_maker(engine: AsyncEngine) -> async_sessionmaker:
    """Create async session maker"""
    return async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )

async def init_db() -> None:
    """Initialize database connection"""
    global engine, async_session_maker
    
    engine = create_engine()
    async_session_maker = create_session_maker(engine)
    
    # Test connection
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    
    logger.info("Database connection established")

async def close_db() -> None:
    """Close database connection"""
    global engine
    
    if engine:
        await engine.dispose()
        logger.info("Database connection closed")

@asynccontextmanager
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Get database session"""
    if not async_session_maker:
        await init_db()
    
    async with async_session_maker() as session:
        try:
            yield session
        except Exception as e:
            logger.error(f"Database error: {str(e)}")
            await session.rollback()
            raise
        finally:
            await session.close()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting database session"""
    async with get_session() as session:
        yield session

class DatabaseManager:
    """Database manager for handling connections and operations"""
    
    def __init__(self):
        self.engine = None
        self.session_maker = None
    
    async def initialize(self):
        """Initialize database connection"""
        self.engine = create_engine()
        self.session_maker = create_session_maker(self.engine)
        await self.test_connection()
    
    async def test_connection(self):
        """Test database connection"""
        async with self.engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    
    async def close(self):
        """Close database connection"""
        if self.engine:
            await self.engine.dispose()
    
    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get database session"""
        if not self.session_maker:
            await self.initialize()
        
        async with self.session_maker() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
    
    async def execute(self, query, params=None):
        """Execute query and return results"""
        async with self.session() as session:
            result = await session.execute(query, params or {})
            return result
    
    async def get_one(self, model, **filters):
        """Get single record"""
        async with self.session() as session:
            query = select(model).filter_by(**filters)
            result = await session.execute(query)
            return result.scalar_one_or_none()
    
    async def get_all(self, model, **filters):
        """Get all records matching filters"""
        async with self.session() as session:
            query = select(model).filter_by(**filters)
            result = await session.execute(query)
            return result.scalars().all()
    
    async def create(self, instance):
        """Create new record"""
        async with self.session() as session:
            session.add(instance)
            await session.commit()
            await session.refresh(instance)
            return instance
    
    async def update(self, instance):
        """Update record"""
        async with self.session() as session:
            await session.merge(instance)
            await session.commit()
            return instance
    
    async def delete(self, instance):
        """Delete record"""
        async with self.session() as session:
            await session.delete(instance)
            await session.commit()

db_manager = DatabaseManager()