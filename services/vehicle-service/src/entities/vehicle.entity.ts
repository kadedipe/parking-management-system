// ============================================================================
// Vehicle Entity - Vehicle Database Entity
// ============================================================================

// parking-management-system/services/vehicle-service/src/entities/vehicle.entity.ts

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Make } from './make.entity';
import { Model } from './model.entity';
import { VehicleType } from './vehicle-type.entity';
import { VehicleFeature } from './vehicle-feature.entity';
import { VehicleImage } from './vehicle-image.entity';

export enum VehicleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DELETED = 'deleted',
}

export enum VehicleOwnership {
  OWNED = 'owned',
  LEASED = 'leased',
  FINANCED = 'financed',
  RENTED = 'rented',
}

@Entity('vehicles')
@Index(['user_id', 'plate_number'])
export class Vehicle {
  @ApiProperty({ description: 'Vehicle ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'User ID who owns the vehicle' })
  @Column({ name: 'user_id', type: 'uuid' })
  user_id: string;

  @ApiProperty({ description: 'Vehicle name/nickname' })
  @Column({ length: 255 })
  name: string;

  @ApiProperty({ description: 'Plate number' })
  @Column({ name: 'plate_number', length: 20, unique: true })
  plate_number: string;

  @ApiProperty({ description: 'VIN number' })
  @Column({ name: 'vin', length: 17, nullable: true })
  vin: string;

  @ApiProperty({ description: 'Color of the vehicle' })
  @Column({ length: 50, nullable: true })
  color: string;

  @ApiProperty({ description: 'Year of manufacture' })
  @Column({ type: 'integer', nullable: true })
  year: number;

  @ApiProperty({ description: 'Is EV or hybrid' })
  @Column({ name: 'is_ev', default: false })
  is_ev: boolean;

  @ApiProperty({ description: 'Battery capacity in kWh' })
  @Column({ name: 'battery_capacity', type: 'float', nullable: true })
  battery_capacity: number;

  @ApiProperty({ description: 'Charging connector type' })
  @Column({ name: 'connector_type', length: 50, nullable: true })
  connector_type: string;

  @ApiProperty({ description: 'Maximum charging power in kW' })
  @Column({ name: 'max_charging_power', type: 'integer', nullable: true })
  max_charging_power: number;

  @ApiProperty({ description: 'Mileage in miles' })
  @Column({ type: 'integer', nullable: true })
  mileage: number;

  @ApiProperty({ description: 'Is vehicle default' })
  @Column({ name: 'is_default', default: false })
  is_default: boolean;

  @ApiProperty({ description: 'Vehicle status' })
  @Column({
    type: 'enum',
    enum: VehicleStatus,
    default: VehicleStatus.ACTIVE,
  })
  status: VehicleStatus;

  @ApiProperty({ description: 'Vehicle ownership type' })
  @Column({
    name: 'ownership',
    type: 'enum',
    enum: VehicleOwnership,
    default: VehicleOwnership.OWNED,
  })
  ownership: VehicleOwnership;

  @ApiProperty({ description: 'Vehicle notes' })
  @Column({ type: 'text', nullable: true })
  notes: string;

  @ApiProperty({ description: 'Vehicle make' })
  @ManyToOne(() => Make, (make) => make.vehicles)
  @JoinColumn({ name: 'make_id' })
  make: Make;

  @ApiProperty({ description: 'Make ID' })
  @Column({ name: 'make_id', type: 'uuid' })
  make_id: string;

  @ApiProperty({ description: 'Vehicle model' })
  @ManyToOne(() => Model, (model) => model.vehicles)
  @JoinColumn({ name: 'model_id' })
  model: Model;

  @ApiProperty({ description: 'Model ID' })
  @Column({ name: 'model_id', type: 'uuid' })
  model_id: string;

  @ApiProperty({ description: 'Vehicle type' })
  @ManyToOne(() => VehicleType, (type) => type.vehicles)
  @JoinColumn({ name: 'type_id' })
  type: VehicleType;

  @ApiProperty({ description: 'Type ID' })
  @Column({ name: 'type_id', type: 'uuid' })
  type_id: string;

  @ApiProperty({ description: 'Vehicle features' })
  @OneToMany(() => VehicleFeature, (feature) => feature.vehicle)
  features: VehicleFeature[];

  @ApiProperty({ description: 'Vehicle images' })
  @OneToMany(() => VehicleImage, (image) => image.vehicle)
  images: VehicleImage[];

  @ApiProperty({ description: 'Created at timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}