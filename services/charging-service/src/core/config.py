# ============================================================================
# Configuration - Charging Service Configuration
# ============================================================================

# parking-management-system/services/charging-service/src/core/config.py

from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field, validator

class Settings(BaseSettings):
    """Application settings"""
    
    # Service Configuration
    SERVICE_NAME: str = "charging-service"
    APP_NAME: str = "EV Charging Service"
    VERSION: str = "2.0.0"
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    DEBUG: bool = Field(default=False, env="DEBUG")
    HOST: str = Field(default="0.0.0.0", env="HOST")
    PORT: int = Field(default=8003, env="PORT")
    DOCS_ENABLED: bool = Field(default=True, env="DOCS_ENABLED")
    
    # Database Configuration
    DB_HOST: str = Field(default="localhost", env="DB_HOST")
    DB_PORT: int = Field(default=5432, env="DB_PORT")
    DB_NAME: str = Field(default="charging_db", env="DB_NAME")
    DB_USER: str = Field(default="charging_user", env="DB_USER")
    DB_PASSWORD: str = Field(default="password", env="DB_PASSWORD")
    DB_POOL_SIZE: int = Field(default=20, env="DB_POOL_SIZE")
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    # Redis Configuration
    REDIS_HOST: str = Field(default="localhost", env="REDIS_HOST")
    REDIS_PORT: int = Field(default=6379, env="REDIS_PORT")
    REDIS_PASSWORD: Optional[str] = Field(default=None, env="REDIS_PASSWORD")
    
    @property
    def REDIS_URL(self) -> str:
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/0"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"
    
    # OCPP Configuration
    OCPP_ENABLED: bool = Field(default=True, env="OCPP_ENABLED")
    OCPP_HOST: str = Field(default="0.0.0.0", env="OCPP_HOST")
    OCPP_PORT: int = Field(default=9000, env="OCPP_PORT")
    OCPP_HEARTBEAT_INTERVAL: int = Field(default=60, env="OCPP_HEARTBEAT_INTERVAL")
    
    # Pricing Configuration
    PRICE_PER_KWH: float = Field(default=0.35, env="PRICE_PER_KWH")
    PRICE_PER_MINUTE: float = Field(default=0.05, env="PRICE_PER_MINUTE")
    CONNECTION_FEE: float = Field(default=0.50, env="CONNECTION_FEE")
    
    # Charging Profiles
    CHARGING_PROFILES: dict = {
        "standard": {"max_power": 22, "max_current": 32},
        "fast": {"max_power": 50, "max_current": 63},
        "rapid": {"max_power": 150, "max_current": 200},
        "ultra_rapid": {"max_power": 350, "max_current": 500},
    }
    
    # Connector Types
    CONNECTOR_TYPES: List[str] = [
        "type1",
        "type2",
        "ccs",
        "chademo",
        "tesla",
    ]
    
    # Security
    JWT_SECRET: str = Field(default="your-secret-key", env="JWT_SECRET")
    JWT_ALGORITHM: str = Field(default="HS256", env="JWT_ALGORITHM")
    
    # CORS
    CORS_ORIGINS: List[str] = Field(default=["*"], env="CORS_ORIGINS")
    
    # Monitoring
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    SENTRY_DSN: Optional[str] = Field(default=None, env="SENTRY_DSN")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

settings = Settings()