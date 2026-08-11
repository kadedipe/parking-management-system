# ============================================================================
# Charging Service - Core Charging Business Logic
# ============================================================================

# parking-management-system/services/charging-service/src/services/charging_service.py

from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from uuid import UUID, uuid4
from decimal import Decimal

from src.core.logging import get_logger
from src.core.config import settings
from src.domain.models import ChargingStation, ChargingSession, ChargingConnector
from src.domain.enums import (
    ChargingStatus,
    ConnectorType,
    ChargingProfile,
)
from src.infrastructure.repositories import (
    ChargingStationRepository,
    ChargingSessionRepository,
)
from src.services.ocpp_service import OCPPService

logger = get_logger(__name__)

class ChargingService:
    """Core charging service implementation"""
    
    def __init__(
        self,
        station_repo: ChargingStationRepository,
        session_repo: ChargingSessionRepository,
        ocpp_service: OCPPService,
    ):
        self.station_repo = station_repo
        self.session_repo = session_repo
        self.ocpp_service = ocpp_service
    
    async def create_station(
        self,
        name: str,
        address: str,
        latitude: float,
        longitude: float,
        connectors: List[Dict[str, Any]],
        power_level: str = "standard",
        price_per_kwh: float = None,
    ) -> ChargingStation:
        """Create a new charging station"""
        station = ChargingStation(
            id=uuid4(),
            name=name,
            address=address,
            latitude=latitude,
            longitude=longitude,
            power_level=power_level,
            price_per_kwh=price_per_kwh or settings.PRICE_PER_KWH,
            status="available",
            created_at=datetime.utcnow(),
        )
        
        # Create connectors
        for connector_data in connectors:
            connector = ChargingConnector(
                id=uuid4(),
                station_id=station.id,
                type=connector_data.get("type", "type2"),
                max_power=connector_data.get("max_power", 22),
                status="available",
            )
            station.connectors.append(connector)
        
        await self.station_repo.create(station)
        logger.info(f"Charging station created: {station.id}")
        return station
    
    async def get_station(
        self,
        station_id: UUID,
    ) -> Optional[ChargingStation]:
        """Get charging station by ID"""
        return await self.station_repo.get_by_id(station_id)
    
    async def get_stations(
        self,
        page: int = 1,
        limit: int = 10,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        radius: Optional[float] = None,
        status: Optional[str] = None,
        power_level: Optional[str] = None,
    ) -> tuple[List[ChargingStation], int]:
        """Get list of charging stations"""
        return await self.station_repo.get_paginated(
            page=page,
            limit=limit,
            latitude=latitude,
            longitude=longitude,
            radius=radius,
            status=status,
            power_level=power_level,
        )
    
    async def update_station(
        self,
        station_id: UUID,
        data: Dict[str, Any],
    ) -> Optional[ChargingStation]:
        """Update charging station"""
        station = await self.station_repo.get_by_id(station_id)
        if not station:
            return None
        
        # Update fields
        for key, value in data.items():
            if hasattr(station, key):
                setattr(station, key, value)
        
        station.updated_at = datetime.utcnow()
        await self.station_repo.update(station)
        logger.info(f"Charging station updated: {station_id}")
        return station
    
    async def start_charging(
        self,
        station_id: UUID,
        connector_id: UUID,
        vehicle_id: UUID,
        user_id: UUID,
    ) -> Optional[ChargingSession]:
        """Start a charging session"""
        # Validate station
        station = await self.station_repo.get_by_id(station_id)
        if not station:
            logger.error(f"Station not found: {station_id}")
            return None
        
        # Validate connector
        connector = station.get_connector(connector_id)
        if not connector or connector.status != "available":
            logger.error(f"Connector not available: {connector_id}")
            return None
        
        # Create session
        session = ChargingSession(
            id=uuid4(),
            station_id=station_id,
            connector_id=connector_id,
            vehicle_id=vehicle_id,
            user_id=user_id,
            start_time=datetime.utcnow(),
            status=ChargingStatus.STARTED,
            meter_start=0,
        )
        
        # Update connector status
        connector.status = "occupied"
        connector.vehicle_id = vehicle_id
        connector.occupied_since = datetime.utcnow()
        
        # Save to database
        await self.session_repo.create(session)
        await self.station_repo.update(station)
        
        # Start OCPP session
        if self.ocpp_service.is_connected():
            await self.ocpp_service.start_transaction(
                station_id,
                connector_id,
                user_id,
            )
        
        logger.info(f"Charging session started: {session.id}")
        return session
    
    async def stop_charging(
        self,
        session_id: UUID,
    ) -> Optional[ChargingSession]:
        """Stop a charging session"""
        session = await self.session_repo.get_by_id(session_id)
        if not session:
            logger.error(f"Session not found: {session_id}")
            return None
        
        if session.status in [ChargingStatus.COMPLETED, ChargingStatus.CANCELLED]:
            logger.warning(f"Session already stopped: {session_id}")
            return session
        
        # Update session
        session.stop_time = datetime.utcnow()
        session.duration = (session.stop_time - session.start_time).total_seconds()
        session.status = ChargingStatus.COMPLETED
        
        # Calculate cost
        session.cost = await self.calculate_cost(session)
        
        # Update connector
        station = await self.station_repo.get_by_id(session.station_id)
        if station:
            connector = station.get_connector(session.connector_id)
            if connector:
                connector.status = "available"
                connector.vehicle_id = None
                connector.occupied_since = None
        
        # Save changes
        await self.session_repo.update(session)
        if station:
            await self.station_repo.update(station)
        
        # Stop OCPP session
        if self.ocpp_service.is_connected():
            await self.ocpp_service.stop_transaction(
                session_id,
                session.meter_stop or 0,
            )
        
        logger.info(f"Charging session stopped: {session_id}")
        return session
    
    async def get_session(
        self,
        session_id: UUID,
    ) -> Optional[ChargingSession]:
        """Get charging session by ID"""
        return await self.session_repo.get_by_id(session_id)
    
    async def get_user_sessions(
        self,
        user_id: UUID,
        page: int = 1,
        limit: int = 10,
    ) -> tuple[List[ChargingSession], int]:
        """Get user's charging sessions"""
        return await self.session_repo.get_by_user(
            user_id=user_id,
            page=page,
            limit=limit,
        )
    
    async def get_active_sessions(
        self,
        station_id: Optional[UUID] = None,
    ) -> List[ChargingSession]:
        """Get active charging sessions"""
        return await self.session_repo.get_active_sessions(station_id)
    
    async def calculate_cost(
        self,
        session: ChargingSession,
    ) -> float:
        """Calculate charging cost"""
        # Get station pricing
        station = await self.station_repo.get_by_id(session.station_id)
        if not station:
            return 0.0
        
        # Calculate energy cost
        energy_kwh = session.meter_stop - session.meter_start if session.meter_stop else 0
        energy_cost = energy_kwh * (station.price_per_kwh or settings.PRICE_PER_KWH)
        
        # Calculate time cost
        duration_minutes = session.duration / 60 if session.duration else 0
        time_cost = duration_minutes * settings.PRICE_PER_MINUTE
        
        # Add connection fee
        total_cost = energy_cost + time_cost + settings.CONNECTION_FEE
        
        return round(total_cost, 2)
    
    async def update_session_status(
        self,
        session_id: UUID,
        status: ChargingStatus,
        data: Optional[Dict[str, Any]] = None,
    ) -> Optional[ChargingSession]:
        """Update session status"""
        session = await self.session_repo.get_by_id(session_id)
        if not session:
            return None
        
        session.status = status
        session.updated_at = datetime.utcnow()
        
        if data:
            for key, value in data.items():
                if hasattr(session, key):
                    setattr(session, key, value)
        
        await self.session_repo.update(session)
        return session