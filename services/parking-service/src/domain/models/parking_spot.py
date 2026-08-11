# ============================================================================
# Domain Models - Parking Spot Entity
# ============================================================================

# parking-management-system/services/parking-service/src/domain/models/parking_spot.py

from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum
from uuid import UUID, uuid4
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, 
    ForeignKey, Enum as SQLEnum, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from src.core.database import Base

class ParkingSpotStatus(str, Enum):
    """Parking spot status enum"""
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    RESERVED = "reserved"
    MAINTENANCE = "maintenance"
    OUT_OF_SERVICE = "out_of_service"

class ParkingSpotType(str, Enum):
    """Parking spot type enum"""
    STANDARD = "standard"
    COMPACT = "compact"
    HANDICAP = "handicap"
    EV_CHARGING = "ev_charging"
    PREMIUM = "premium"
    VALET = "valet"
    MOTORCYCLE = "motorcycle"
    LARGE = "large"

class ParkingSpot(Base):
    """Parking spot entity"""
    __tablename__ = "parking_spots"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    parking_lot_id = Column(PGUUID(as_uuid=True), ForeignKey("parking_lots.id"), nullable=False)
    number = Column(String(20), nullable=False)
    level = Column(Integer, nullable=False, default=1)
    
    type = Column(SQLEnum(ParkingSpotType), nullable=False, default=ParkingSpotType.STANDARD)
    status = Column(SQLEnum(ParkingSpotStatus), nullable=False, default=ParkingSpotStatus.AVAILABLE)
    
    # Physical attributes
    width = Column(Float)
    length = Column(Float)
    height = Column(Float)
    is_covered = Column(Boolean, default=False)
    is_handicap = Column(Boolean, default=False)
    is_ev_charging = Column(Boolean, default=False)
    
    # EV charging specific
    connector_type = Column(String(50))
    charging_power = Column(Integer)  # in kW
    charging_price = Column(Float)    # per kWh
    
    # Current assignment
    vehicle_id = Column(PGUUID(as_uuid=True))
    vehicle_plate = Column(String(20))
    reserved_until = Column(DateTime)
    occupied_since = Column(DateTime)
    
    # Metadata
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    parking_lot = relationship("ParkingLot", back_populates="spots")
    
    def __repr__(self):
        return f"<ParkingSpot {self.number}>"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "id": str(self.id),
            "parking_lot_id": str(self.parking_lot_id),
            "number": self.number,
            "level": self.level,
            "type": self.type.value if self.type else None,
            "status": self.status.value if self.status else None,
            "width": self.width,
            "length": self.length,
            "height": self.height,
            "is_covered": self.is_covered,
            "is_handicap": self.is_handicap,
            "is_ev_charging": self.is_ev_charging,
            "connector_type": self.connector_type,
            "charging_power": self.charging_power,
            "charging_price": self.charging_price,
            "vehicle_id": str(self.vehicle_id) if self.vehicle_id else None,
            "vehicle_plate": self.vehicle_plate,
            "reserved_until": self.reserved_until.isoformat() if self.reserved_until else None,
            "occupied_since": self.occupied_since.isoformat() if self.occupied_since else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
    
    def is_available(self) -> bool:
        """Check if spot is available"""
        return self.status == ParkingSpotStatus.AVAILABLE
    
    def is_occupied(self) -> bool:
        """Check if spot is occupied"""
        return self.status == ParkingSpotStatus.OCCUPIED
    
    def is_reserved(self) -> bool:
        """Check if spot is reserved"""
        return self.status == ParkingSpotStatus.RESERVED
    
    def is_ev_charging_spot(self) -> bool:
        """Check if spot has EV charging"""
        return self.is_ev_charging
    
    def reserve(self, vehicle_id: UUID, reservation_time: datetime) -> None:
        """Reserve the spot"""
        self.status = ParkingSpotStatus.RESERVED
        self.vehicle_id = vehicle_id
        self.reserved_until = reservation_time
        self.updated_at = datetime.utcnow()
    
    def occupy(self, vehicle_id: UUID, vehicle_plate: str) -> None:
        """Occupy the spot"""
        self.status = ParkingSpotStatus.OCCUPIED
        self.vehicle_id = vehicle_id
        self.vehicle_plate = vehicle_plate
        self.occupied_since = datetime.utcnow()
        self.reserved_until = None
        self.updated_at = datetime.utcnow()
    
    def release(self) -> None:
        """Release the spot"""
        self.status = ParkingSpotStatus.AVAILABLE
        self.vehicle_id = None
        self.vehicle_plate = None
        self.occupied_since = None
        self.reserved_until = None
        self.updated_at = datetime.utcnow()
    
    def mark_maintenance(self) -> None:
        """Mark spot for maintenance"""
        self.status = ParkingSpotStatus.MAINTENANCE
        self.updated_at = datetime.utcnow()