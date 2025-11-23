import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InventoryService } from './inventory.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { CreateMovementDto } from './dto/create-movement.dto';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { GetInventoryQueryDto } from './dto/get-inventory-query.dto';
import { GetMovementsQueryDto } from './dto/get-movements-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { InventoryMovementType } from '@prisma/client';
import { QuerySanitizerInterceptor } from '../common/security/query-sanitizer.interceptor';
import { ParamValidatorPipe } from '../common/security/param-validator.pipe';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
@UseInterceptors(QuerySanitizerInterceptor)
@UsePipes(ParamValidatorPipe)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ============================================
  // PRODUCTOS
  // ============================================

  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests por minuto
  @Post('products')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  createProduct(@Body() createProductDto: CreateProductDto) {
    return this.inventoryService.createProduct(createProductDto);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests por minuto
  @Get('products')
  findAllProducts(@Query() queryDto: GetProductsQueryDto) {
    return this.inventoryService.findAllProducts({
      search: queryDto.search,
      category: queryDto.category,
      brand: queryDto.brand,
      isActive: queryDto.isActive,
    });
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests por minuto
  @Get('products/:id')
  findProductById(@Param('id') id: string) {
    return this.inventoryService.findProductById(id);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests por minuto
  @Get('products/sku/:sku')
  findProductBySku(@Param('sku') sku: string) {
    return this.inventoryService.findProductBySku(sku);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests por minuto
  @Patch('products/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  updateProduct(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.inventoryService.updateProduct(id, updateProductDto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests por minuto
  @Delete('products/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  deleteProduct(@Param('id') id: string) {
    return this.inventoryService.deleteProduct(id);
  }

  // ============================================
  // INVENTARIO
  // ============================================

  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests por minuto
  @Post('inventory')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  createInventory(@Body() createInventoryDto: CreateInventoryDto) {
    return this.inventoryService.createInventory(createInventoryDto);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests por minuto
  @Get('inventory')
  findAllInventory(@Query() queryDto: GetInventoryQueryDto) {
    return this.inventoryService.findAllInventory({
      productId: queryDto.productId,
      location: queryDto.location,
      warehouse: queryDto.warehouse,
      lowStock: queryDto.lowStock,
    });
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests por minuto
  @Get('inventory/:id')
  findInventoryById(@Param('id') id: string) {
    return this.inventoryService.findInventoryById(id);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests por minuto
  @Patch('inventory/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  updateInventory(@Param('id') id: string, @Body() updateInventoryDto: UpdateInventoryDto) {
    return this.inventoryService.updateInventory(id, updateInventoryDto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests por minuto
  @Delete('inventory/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  deleteInventory(@Param('id') id: string) {
    return this.inventoryService.deleteInventory(id);
  }

  // ============================================
  // MOVIMIENTOS
  // ============================================

  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests por minuto
  @Post('movements')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  createMovement(@CurrentUser() user: any, @Body() createMovementDto: CreateMovementDto) {
    return this.inventoryService.createMovement(createMovementDto, user.id);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests por minuto
  @Get('movements')
  findAllMovements(@Query() queryDto: GetMovementsQueryDto) {
    return this.inventoryService.findAllMovements({
      inventoryId: queryDto.inventoryId,
      productId: queryDto.productId,
      type: queryDto.type,
      referenceId: queryDto.referenceId,
      referenceType: queryDto.referenceType,
      startDate: queryDto.startDate ? new Date(queryDto.startDate) : undefined,
      endDate: queryDto.endDate ? new Date(queryDto.endDate) : undefined,
    });
  }

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests por minuto
  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  getInventoryStats() {
    return this.inventoryService.getInventoryStats();
  }

  @Throttle({ default: { limit: 1, ttl: 60000 } }) // 1 request por minuto (seed es operación pesada)
  @Post('seed')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  seedInventory() {
    return this.inventoryService.seedInventory();
  }
}

