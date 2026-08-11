// ============================================================================
// Parking Types - Parking Type Definitions
// ============================================================================

// parking-management-system/shared/types/src/parking.types.ts

import { Location, Address, Money } from './common.types';

/**
 * Parking lot status enum
 */
export enum ParkingLotStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  CLOSED = 'closed',
}

/**
 * Parking lot type enum
 */
export enum ParkingLotType {
  STANDARD = 'standard',
  PREMIUM = 'premium',
  VALET = 'valet',
  EV_CHARGING = 'ev_charging',
  MULTI_LEVEL = 'multi_level',
}

/**
 * Parking spot status enum
 */
export enum ParkingSpotStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  MAINTENANCE = 'maintenance',
  OUT_OF_SERVICE = 'out_of_service',
}

/**
 * Parking spot type enum
 */
export enum ParkingSpotType {
  STANDARD = 'standard',
  COMPACT = 'compact',
  HANDICAP = 'handicap',
  EV_CHARGING = 'ev_charging',
  PREMIUM = 'premium',
  VALET = 'valet',
  MOTORCYCLE = 'motorcycle',
  LARGE = 'large',
}

/**
 * Parking lot entity
 */
export interface ParkingLot {
  id: string;
  name: string;
  description?: string;
  type: ParkingLotType;
  status: ParkingLotStatus;
  address: Address;
  location: Location;
  totalSpots: number;
  availableSpots: number;
  reservedSpots: number;
  basePricePerHour: Money;
  basePricePerDay?: Money;
  basePricePerMonth?: Money;
  amenities: string[];
  features: string[];
  operatingHours?: OperatingHours;
  phone?: string;
  email?: string;
  website?: string;
  rating: number;
  reviewCount: number;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Parking spot entity
 */
export interface ParkingSpot {
  id: string;
  parkingLotId: string;
  number: string;
  level: number;
  type: ParkingSpotType;
  status: ParkingSpotStatus;
  width?: number;
  length?: number;
  height?: number;
  isCovered: boolean;
  isHandicap: boolean;
  isEvCharging: boolean;
  connectorType?: string;
  chargingPower?: number;
  chargingPrice?: number;
  vehicleId?: string;
  vehiclePlate?: string;
  reservedUntil?: string;
  occupiedSince?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Operating hours
 */
export interface OperatingHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

/**
 * Day hours
 */
export interface DayHours {
  open: string;
  close: string;
}

/**
 * Parking review
 */
export interface ParkingReview {
  id: string;
  parkingLotId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Parking availability
 */
export interface ParkingAvailability {
  parkingLotId: string;
  totalSpots: number;
  availableSpots: number;
  reservedSpots: number;
  occupancyRate: number;
  isFull: boolean;
  spots: ParkingSpot[];
}