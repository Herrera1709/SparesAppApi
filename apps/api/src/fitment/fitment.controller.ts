import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { FitmentService } from './fitment.service';
import { CreateFitmentDto } from './dto/create-fitment.dto';
import { UpdateFitmentDto } from './dto/update-fitment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PublicApi } from '../common/security/public-api.decorator';

@Controller('fitment')
export class FitmentController {
  constructor(private readonly fitmentService: FitmentService) {}

  @PublicApi()
  @Get()
  findAll(
    @Query('productId') productId?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('vehicleVariantId') vehicleVariantId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.fitmentService.findAll({
      productId,
      vehicleId,
      vehicleVariantId,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @PublicApi()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fitmentService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() createFitmentDto: CreateFitmentDto) {
    return this.fitmentService.create(createFitmentDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('bulk')
  createBulk(@Body() fitments: CreateFitmentDto[]) {
    return this.fitmentService.createBulk(fitments);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFitmentDto: UpdateFitmentDto) {
    return this.fitmentService.update(id, updateFitmentDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fitmentService.remove(id);
  }
}

