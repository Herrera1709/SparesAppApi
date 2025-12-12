import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { CreateVehicleVariantDto } from './dto/create-vehicle-variant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PublicApi } from '../common/security/public-api.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  // ============================================
  // ENDPOINTS PÚBLICOS (Para selector de vehículo)
  // ============================================

  @PublicApi()
  @Get('makes')
  getMakes() {
    return this.vehiclesService.getMakes();
  }

  @PublicApi()
  @Get('models')
  getModelsByMake(@Query('make') make: string) {
    if (!make) {
      return [];
    }
    return this.vehiclesService.getModelsByMake(make);
  }

  @PublicApi()
  @Get('years')
  getYearsByMakeAndModel(
    @Query('make') make: string,
    @Query('model') model: string,
  ) {
    if (!make || !model) {
      return [];
    }
    return this.vehiclesService.getYearsByMakeAndModel(make, model);
  }

  @PublicApi()
  @Get('find')
  findVehicleByMakeModelYear(
    @Query('make') make: string,
    @Query('model') model: string,
    @Query('year') year: string,
  ) {
    if (!make || !model || !year) {
      return null;
    }
    return this.vehiclesService.findVehicleByMakeModelYear(make, model, parseInt(year));
  }

  @PublicApi()
  @Get()
  findAll(
    @Query('make') make?: string,
    @Query('model') model?: string,
    @Query('year') year?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.vehiclesService.findAll({
      make,
      model,
      year: year ? parseInt(year) : undefined,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @PublicApi()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  @PublicApi()
  @Get(':id/variants')
  getVariants(@Param('id') id: string) {
    return this.vehiclesService.getVariantsByVehicle(id);
  }

  // ============================================
  // ENDPOINTS ADMIN (Requieren autenticación)
  // ============================================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() createVehicleDto: CreateVehicleDto) {
    return this.vehiclesService.create(createVehicleDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/variants')
  createVariant(
    @Param('id') id: string,
    @Body() createVariantDto: CreateVehicleVariantDto,
  ) {
    return this.vehiclesService.createVariant(id, createVariantDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVehicleDto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, updateVehicleDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vehiclesService.remove(id);
  }
}

