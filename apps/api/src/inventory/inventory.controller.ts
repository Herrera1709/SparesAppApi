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
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { CreateMovementDto } from './dto/create-movement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { InventoryMovementType } from '@prisma/client';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ============================================
  // PRODUCTOS
  // ============================================

  @Post('products')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  createProduct(@Body() createProductDto: CreateProductDto) {
    return this.inventoryService.createProduct(createProductDto);
  }

  @Get('products')
  @Public()
  findAllProducts(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('brand') brand?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.inventoryService.findAllProducts({
      search,
      category,
      brand,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get('products/:id')
  findProductById(@Param('id') id: string) {
    return this.inventoryService.findProductById(id);
  }

  @Get('products/sku/:sku')
  findProductBySku(@Param('sku') sku: string) {
    return this.inventoryService.findProductBySku(sku);
  }

  @Patch('products/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  updateProduct(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.inventoryService.updateProduct(id, updateProductDto);
  }

  @Delete('products/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  deleteProduct(@Param('id') id: string) {
    return this.inventoryService.deleteProduct(id);
  }

  // ============================================
  // INVENTARIO
  // ============================================

  @Post('inventory')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  createInventory(@Body() createInventoryDto: CreateInventoryDto) {
    return this.inventoryService.createInventory(createInventoryDto);
  }

  @Get('inventory')
  findAllInventory(
    @Query('productId') productId?: string,
    @Query('location') location?: string,
    @Query('warehouse') warehouse?: string,
    @Query('lowStock') lowStock?: string,
  ) {
    return this.inventoryService.findAllInventory({
      productId,
      location,
      warehouse,
      lowStock: lowStock === 'true',
    });
  }

  @Get('inventory/:id')
  findInventoryById(@Param('id') id: string) {
    return this.inventoryService.findInventoryById(id);
  }

  @Patch('inventory/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  updateInventory(@Param('id') id: string, @Body() updateInventoryDto: UpdateInventoryDto) {
    return this.inventoryService.updateInventory(id, updateInventoryDto);
  }

  @Delete('inventory/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  deleteInventory(@Param('id') id: string) {
    return this.inventoryService.deleteInventory(id);
  }

  // ============================================
  // MOVIMIENTOS
  // ============================================

  @Post('movements')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  createMovement(@CurrentUser() user: any, @Body() createMovementDto: CreateMovementDto) {
    return this.inventoryService.createMovement(createMovementDto, user.id);
  }

  @Get('movements')
  findAllMovements(
    @Query('inventoryId') inventoryId?: string,
    @Query('productId') productId?: string,
    @Query('type') type?: InventoryMovementType,
    @Query('referenceId') referenceId?: string,
    @Query('referenceType') referenceType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.inventoryService.findAllMovements({
      inventoryId,
      productId,
      type,
      referenceId,
      referenceType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  getInventoryStats() {
    return this.inventoryService.getInventoryStats();
  }

  @Post('seed')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  seedInventory() {
    return this.inventoryService.seedInventory();
  }
}

