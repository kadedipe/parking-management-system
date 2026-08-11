// ============================================================================
// Vehicle Service - Core Business Logic
// ============================================================================

// parking-management-system/services/vehicle-service/src/services/vehicle.service.ts

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

import { Vehicle, VehicleStatus, VehicleOwnership } from '../entities/vehicle.entity';
import { Make } from '../entities/make.entity';
import { Model } from '../entities/model.entity';
import { VehicleType } from '../entities/vehicle-type.entity';
import { VehicleFeature } from '../entities/vehicle-feature.entity';
import { VehicleImage } from '../entities/vehicle-image.entity';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  VehicleResponseDto,
  VehicleListQueryDto,
  VehicleSearchDto,
} from '../dto';
import { VehicleCreatedEvent, VehicleUpdatedEvent, VehicleDeletedEvent } from '../events';

@Injectable()
export class VehicleService {
  private readonly logger = new Logger(VehicleService.name);

  constructor(
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
    @InjectRepository(Make)
    private makeRepository: Repository<Make>,
    @InjectRepository(Model)
    private modelRepository: Repository<Model>,
    @InjectRepository(VehicleType)
    private typeRepository: Repository<VehicleType>,
    @InjectRepository(VehicleFeature)
    private featureRepository: Repository<VehicleFeature>,
    @InjectRepository(VehicleImage)
    private imageRepository: Repository<VehicleImage>,
    private eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // ============================================================================
  // Vehicle CRUD Operations
  // ============================================================================

  async createVehicle(
    userId: string,
    createDto: CreateVehicleDto,
  ): Promise<VehicleResponseDto> {
    this.logger.log(`Creating vehicle for user ${userId}`);

    // Check if plate number already exists
    const existingVehicle = await this.vehicleRepository.findOne({
      where: { plate_number: createDto.plate_number },
    });

    if (existingVehicle) {
      throw new ConflictException('Vehicle with this plate number already exists');
    }

    // Validate make, model, and type
    const make = await this.makeRepository.findOne({
      where: { id: createDto.make_id },
    });
    if (!make) {
      throw new NotFoundException(`Make with ID ${createDto.make_id} not found`);
    }

    const model = await this.modelRepository.findOne({
      where: { id: createDto.model_id },
    });
    if (!model) {
      throw new NotFoundException(`Model with ID ${createDto.model_id} not found`);
    }

    const type = await this.typeRepository.findOne({
      where: { id: createDto.type_id },
    });
    if (!type) {
      throw new NotFoundException(`Type with ID ${createDto.type_id} not found`);
    }

    // Create vehicle
    const vehicle = this.vehicleRepository.create({
      ...createDto,
      user_id: userId,
      status: VehicleStatus.ACTIVE,
      is_default: false,
    });

    // Save vehicle
    const savedVehicle = await this.vehicleRepository.save(vehicle);

    // Handle features
    if (createDto.features && createDto.features.length > 0) {
      const features = createDto.features.map((feature) =>
        this.featureRepository.create({
          vehicle_id: savedVehicle.id,
          name: feature.name,
          value: feature.value,
        }),
      );
      await this.featureRepository.save(features);
    }

    // Handle images
    if (createDto.images && createDto.images.length > 0) {
      const images = createDto.images.map((image) =>
        this.imageRepository.create({
          vehicle_id: savedVehicle.id,
          url: image.url,
          is_primary: image.is_primary || false,
          order: image.order || 0,
        }),
      );
      await this.imageRepository.save(images);
    }

    // Set as default if first vehicle
    const vehicleCount = await this.vehicleRepository.count({
      where: { user_id: userId },
    });
    if (vehicleCount === 1) {
      savedVehicle.is_default = true;
      await this.vehicleRepository.save(savedVehicle);
    }

    // Emit event
    this.eventEmitter.emit(
      'vehicle.created',
      new VehicleCreatedEvent(savedVehicle.id, userId, savedVehicle),
    );

    // Clear cache
    await this.clearCache(userId);

    return this.toResponseDto(savedVehicle);
  }

  async getVehicles(
    userId: string,
    query: VehicleListQueryDto,
  ): Promise<{ items: VehicleResponseDto[]; total: number }> {
    const cacheKey = `vehicles:${userId}:${JSON.stringify(query)}`;
    const cached = await this.cacheManager.get<{
      items: VehicleResponseDto[];
      total: number;
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    const where: FindOptionsWhere<Vehicle> = {
      user_id: userId,
      status: VehicleStatus.ACTIVE,
    };

    if (query.search) {
      where.name = Like(`%${query.search}%`);
    }

    if (query.make_id) {
      where.make_id = query.make_id;
    }

    if (query.model_id) {
      where.model_id = query.model_id;
    }

    if (query.type_id) {
      where.type_id = query.type_id;
    }

    const [vehicles, total] = await this.vehicleRepository.findAndCount({
      where,
      relations: ['make', 'model', 'type', 'features', 'images'],
      order: {
        is_default: 'DESC',
        created_at: 'DESC',
      },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    const result = {
      items: vehicles.map((v) => this.toResponseDto(v)),
      total,
    };

    // Cache result
    await this.cacheManager.set(cacheKey, result, 300); // 5 minutes

    return result;
  }

  async getVehicleById(userId: string, vehicleId: string): Promise<VehicleResponseDto> {
    const cacheKey = `vehicle:${userId}:${vehicleId}`;
    const cached = await this.cacheManager.get<VehicleResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const vehicle = await this.vehicleRepository.findOne({
      where: { id: vehicleId, user_id: userId },
      relations: ['make', 'model', 'type', 'features', 'images'],
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    const result = this.toResponseDto(vehicle);

    // Cache result
    await this.cacheManager.set(cacheKey, result, 300); // 5 minutes

    return result;
  }

  async updateVehicle(
    userId: string,
    vehicleId: string,
    updateDto: UpdateVehicleDto,
  ): Promise<VehicleResponseDto> {
    this.logger.log(`Updating vehicle ${vehicleId} for user ${userId}`);

    const vehicle = await this.vehicleRepository.findOne({
      where: { id: vehicleId, user_id: userId },
      relations: ['features', 'images'],
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    // Validate make, model, type if provided
    if (updateDto.make_id) {
      const make = await this.makeRepository.findOne({
        where: { id: updateDto.make_id },
      });
      if (!make) {
        throw new NotFoundException(`Make with ID ${updateDto.make_id} not found`);
      }
    }

    if (updateDto.model_id) {
      const model = await this.modelRepository.findOne({
        where: { id: updateDto.model_id },
      });
      if (!model) {
        throw new NotFoundException(`Model with ID ${updateDto.model_id} not found`);
      }
    }

    if (updateDto.type_id) {
      const type = await this.typeRepository.findOne({
        where: { id: updateDto.type_id },
      });
      if (!type) {
        throw new NotFoundException(`Type with ID ${updateDto.type_id} not found`);
      }
    }

    // Update vehicle
    Object.assign(vehicle, updateDto);
    const updatedVehicle = await this.vehicleRepository.save(vehicle);

    // Emit event
    this.eventEmitter.emit(
      'vehicle.updated',
      new VehicleUpdatedEvent(updatedVehicle.id, userId, updatedVehicle),
    );

    // Clear cache
    await this.clearCache(userId);
    await this.cacheManager.del(`vehicle:${userId}:${vehicleId}`);

    return this.toResponseDto(updatedVehicle);
  }

  async deleteVehicle(userId: string, vehicleId: string): Promise<void> {
    this.logger.log(`Deleting vehicle ${vehicleId} for user ${userId}`);

    const vehicle = await this.vehicleRepository.findOne({
      where: { id: vehicleId, user_id: userId },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    // Soft delete
    vehicle.status = VehicleStatus.DELETED;
    await this.vehicleRepository.save(vehicle);

    // Emit event
    this.eventEmitter.emit(
      'vehicle.deleted',
      new VehicleDeletedEvent(vehicleId, userId),
    );

    // Clear cache
    await this.clearCache(userId);
    await this.cacheManager.del(`vehicle:${userId}:${vehicleId}`);
  }

  // ============================================================================
  // Default Vehicle Management
  // ============================================================================

  async setDefaultVehicle(userId: string, vehicleId: string): Promise<void> {
    this.logger.log(`Setting default vehicle ${vehicleId} for user ${userId}`);

    // Verify vehicle belongs to user
    const vehicle = await this.vehicleRepository.findOne({
      where: { id: vehicleId, user_id: userId },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    // Reset all vehicles to non-default
    await this.vehicleRepository.update(
      { user_id: userId },
      { is_default: false },
    );

    // Set this vehicle as default
    vehicle.is_default = true;
    await this.vehicleRepository.save(vehicle);

    // Clear cache
    await this.clearCache(userId);
  }

  // ============================================================================
  // Vehicle Search
  // ============================================================================

  async searchVehicles(
    userId: string,
    searchDto: VehicleSearchDto,
  ): Promise<VehicleResponseDto[]> {
    const query = this.vehicleRepository
      .createQueryBuilder('vehicle')
      .leftJoinAndSelect('vehicle.make', 'make')
      .leftJoinAndSelect('vehicle.model', 'model')
      .leftJoinAndSelect('vehicle.type', 'type')
      .where('vehicle.user_id = :userId', { userId })
      .andWhere('vehicle.status = :status', { status: VehicleStatus.ACTIVE });

    if (searchDto.query) {
      query.andWhere(
        '(vehicle.name ILIKE :query OR vehicle.plate_number ILIKE :query)',
        { query: `%${searchDto.query}%` },
      );
    }

    if (searchDto.make_id) {
      query.andWhere('vehicle.make_id = :makeId', { makeId: searchDto.make_id });
    }

    if (searchDto.model_id) {
      query.andWhere('vehicle.model_id = :modelId', { modelId: searchDto.model_id });
    }

    if (searchDto.type_id) {
      query.andWhere('vehicle.type_id = :typeId', { typeId: searchDto.type_id });
    }

    if (searchDto.is_ev !== undefined) {
      query.andWhere('vehicle.is_ev = :isEv', { isEv: searchDto.is_ev });
    }

    if (searchDto.year_from) {
      query.andWhere('vehicle.year >= :yearFrom', { yearFrom: searchDto.year_from });
    }

    if (searchDto.year_to) {
      query.andWhere('vehicle.year <= :yearTo', { yearTo: searchDto.year_to });
    }

    const vehicles = await query
      .orderBy('vehicle.is_default', 'DESC')
      .addOrderBy('vehicle.created_at', 'DESC')
      .limit(searchDto.limit || 20)
      .getMany();

    return vehicles.map((v) => this.toResponseDto(v));
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private toResponseDto(vehicle: Vehicle): VehicleResponseDto {
    return {
      id: vehicle.id,
      user_id: vehicle.user_id,
      name: vehicle.name,
      plate_number: vehicle.plate_number,
      vin: vehicle.vin,
      color: vehicle.color,
      year: vehicle.year,
      is_ev: vehicle.is_ev,
      battery_capacity: vehicle.battery_capacity,
      connector_type: vehicle.connector_type,
      max_charging_power: vehicle.max_charging_power,
      mileage: vehicle.mileage,
      is_default: vehicle.is_default,
      status: vehicle.status,
      ownership: vehicle.ownership,
      notes: vehicle.notes,
      make: vehicle.make ? {
        id: vehicle.make.id,
        name: vehicle.make.name,
      } : null,
      model: vehicle.model ? {
        id: vehicle.model.id,
        name: vehicle.model.name,
      } : null,
      type: vehicle.type ? {
        id: vehicle.type.id,
        name: vehicle.type.name,
      } : null,
      features: vehicle.features?.map((f) => ({
        id: f.id,
        name: f.name,
        value: f.value,
      })) || [],
      images: vehicle.images?.map((i) => ({
        id: i.id,
        url: i.url,
        is_primary: i.is_primary,
        order: i.order,
      })) || [],
      created_at: vehicle.created_at,
      updated_at: vehicle.updated_at,
    };
  }

  private async clearCache(userId: string): Promise<void> {
    const keys = await this.cacheManager.store.keys(`vehicles:${userId}:*`);
    for (const key of keys) {
      await this.cacheManager.del(key);
    }
  }
}