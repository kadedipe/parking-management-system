// ============================================================================
// Vehicle Controller - Vehicle API Endpoints
// ============================================================================

// parking-management-system/services/vehicle-service/src/controllers/vehicle.controller.ts

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ValidationPipe,
  UsePipes,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { VehicleService } from '../services/vehicle.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  VehicleResponseDto,
  VehicleListQueryDto,
  VehicleSearchDto,
} from '../dto';

@ApiTags('vehicles')
@Controller('api/v1/vehicles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new vehicle' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Vehicle created successfully',
    type: VehicleResponseDto,
  })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Vehicle already exists' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async createVehicle(
    @Request() req,
    @Body() createDto: CreateVehicleDto,
  ): Promise<VehicleResponseDto> {
    const userId = req.user.id;
    return this.vehicleService.createVehicle(userId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vehicles' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vehicles retrieved successfully',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'make_id', required: false, type: String })
  @ApiQuery({ name: 'model_id', required: false, type: String })
  @ApiQuery({ name: 'type_id', required: false, type: String })
  async getVehicles(
    @Request() req,
    @Query() query: VehicleListQueryDto,
  ): Promise<{ items: VehicleResponseDto[]; total: number }> {
    const userId = req.user.id;
    return this.vehicleService.getVehicles(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vehicle by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vehicle retrieved successfully',
    type: VehicleResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Vehicle not found' })
  async getVehicleById(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VehicleResponseDto> {
    const userId = req.user.id;
    return this.vehicleService.getVehicleById(userId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update vehicle' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vehicle updated successfully',
    type: VehicleResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Vehicle not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  async updateVehicle(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateVehicleDto,
  ): Promise<VehicleResponseDto> {
    const userId = req.user.id;
    return this.vehicleService.updateVehicle(userId, id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete vehicle' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Vehicle deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Vehicle not found' })
  async deleteVehicle(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    const userId = req.user.id;
    await this.vehicleService.deleteVehicle(userId, id);
  }

  @Post(':id/default')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set default vehicle' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Default vehicle set' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Vehicle not found' })
  async setDefaultVehicle(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    const userId = req.user.id;
    await this.vehicleService.setDefaultVehicle(userId, id);
  }

  @Post('search')
  @ApiOperation({ summary: 'Search vehicles' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vehicles found',
    type: [VehicleResponseDto],
  })
  async searchVehicles(
    @Request() req,
    @Body() searchDto: VehicleSearchDto,
  ): Promise<VehicleResponseDto[]> {
    const userId = req.user.id;
    return this.vehicleService.searchVehicles(userId, searchDto);
  }
}