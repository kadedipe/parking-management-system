# ============================================================================
# Domain Models - Parking Lot Entity
# ============================================================================

# parking-management-system/services/parking-service/src/domain/models/parking_lot.py

from datetime import datetime
from typing import Optional, List, Dict, Any
from decimal import Decimal
from enum import Enum
from uuid import UUID, uuid4
from dataclasses import dataclass, field
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, 
    Text, JSON, ForeignKey, Enum as SQLEnum, DECIMAL
)
from sqlalchemy.orm import relationship, backref
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from src.core.database import Base
from src.domain.value_objects import Address, Location, OperatingHours, Amenities

class ParkingLotStatus(str, Enum):
    """Parking lot status enum"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"
    CLOSED = "closed"

class ParkingLotType(str, Enum):
    """Parking lot type enum"""
    STANDARD = "standard"
    PREMIUM = "premium"
    VALET = "valet"
    EV_CHARGING = "ev_charging"
    MULTI_LEVEL = "multi_level"

class ParkingLot(Base):
    """Parking lot entity"""
    __tablename__ = "parking_lots"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    type = Column(SQLEnum(ParkingLotType), nullable=False, default=ParkingLotType.STANDARD)
    status = Column(SQLEnum(ParkingLotStatus), nullable=False, default=ParkingLotStatus.ACTIVE)
    
    # Location information
    address = Column(JSON, nullable=False)  # Address value object
    location = Column(JSON, nullable=False)  # Location value object (lat/lng)
    
    # Capacity
    total_spots = Column(Integer, nullable=False)
    available_spots = Column(Integer, nullable=False, default=0)
    reserved_spots = Column(Integer, nullable=False, default=0)
    
    # Pricing
    base_price_per_hour = Column(DECIMAL(10, 2), nullable=False)
    base_price_per_day = Column(DECIMAL(10, 2))
    base_price_per_month = Column(DECIMAL(10, 2))
    
    # Amenities
    amenities = Column(JSON, default=list)  # List of amenities
    features = Column(JSON, default=list)   # List of features
    
    # Operating hours
    operating_hours = Column(JSON)  # OperatingHours value object
    
    # Contact information
    phone = Column(String(20))
    email = Column(String(255))
    website = Column(String(255))
    
    # Ratings
    rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)
    
    # Images
    images = Column(JSON, default=list)  # List of image URLs
    
    # Metadata
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(PGUUID(as_uuid=True))
    updated_by = Column(PGUUID(as_uuid=True))
    
    # Relationships
    spots = relationship("ParkingSpot", back_populates="parking_lot", cascade="all, delete-orphan")
    reviews = relationship("ParkingReview", back_populates="parking_lot", cascade="all, delete-orphan")
    pricing_rules = relationship("PricingRule", back_populates="parking_lot", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ParkingLot {self.name}>"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "id": str(self.id),
            "name": self.name,
            "description": self.description,
            "type": self.type.value if self.type else None,
            "status": self.status.value if self.status else None,
            "address": self.address,
            "location": self.location,
            "total_spots": self.total_spots,
            "available_spots": self.available_spots,
            "reserved_spots": self.reserved_spots,
            "base_price_per_hour": float(self.base_price_per_hour) if self.base_price_per_hour else None,
            "base_price_per_day": float(self.base_price_per_day) if self.base_price_per_day else None,
            "base_price_per_month": float(self.base_price_per_month) if self.base_price_per_month else None,
            "amenities": self.amenities,
            "features": self.features,
            "operating_hours": self.operating_hours,
            "phone": self.phone,
            "email": self.email,
            "website": self.website,
            "rating": self.rating,
            "review_count": self.review_count,
            "images": self.images,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
    
    def update_availability(self, spots_available: int, spots_reserved: int = 0) -> None:
        """Update parking lot availability"""
        self.available_spots = spots_available
        self.reserved_spots = spots_reserved
        
    def is_full(self) -> bool:
        """Check if parking lot is full"""
        return self.available_spots <= 0
    
    def has_available_spots(self) -> bool:
        """Check if parking lot has available spots"""
        return self.available_spots > 0
    
    def get_occupancy_rate(self) -> float:
        """Get occupancy rate as percentage"""
        if self.total_spots == 0:
            return 0.0
        occupied = self.total_spots - self.available_spots
        return (occupied / self.total_spots) * 100
    
    def update_rating(self, new_rating: float) -> None:
        """Update parking lot rating"""
        if self.review_count == 0:
            self.rating = new_rating
        else:
            total = self.rating * self.review_count
            self.rating = (total + new_rating) / (self.review_count + 1)
        self.review_count += 1