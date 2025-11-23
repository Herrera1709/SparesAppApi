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
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { GetOrdersQueryDto } from './dto/get-orders-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { OrderStatus } from '@prisma/client';
import { QuerySanitizerInterceptor } from '../common/security/query-sanitizer.interceptor';
import { ParamValidatorPipe } from '../common/security/param-validator.pipe';

@Controller('orders')
@UseGuards(JwtAuthGuard)
@UseInterceptors(QuerySanitizerInterceptor)
@UsePipes(ParamValidatorPipe)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests por minuto
  @Post()
  create(@CurrentUser() user: any, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(user.id, createOrderDto);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests por minuto
  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query() queryDto: GetOrdersQueryDto,
  ) {
    const isAdmin = user.role === 'ADMIN';
    
    // ============================================
    // SEGURIDAD: Solo admins pueden usar filtros
    // Si un usuario no admin intenta usar filtros, ignorarlos
    // ============================================
    if (!isAdmin) {
      // Usuario no admin: ignorar TODOS los filtros y retornar solo sus órdenes
      return this.ordersService.findAll(user.id, false);
    }
    
    // Admin con filtros
    if (queryDto.status || queryDto.userId || queryDto.startDate || queryDto.endDate || queryDto.hasIssue !== undefined || queryDto.tags) {
      return this.ordersService.findAllWithFilters({
        status: queryDto.status,
        userId: queryDto.userId, // Solo admins pueden filtrar por userId (ya validado en DTO)
        startDate: queryDto.startDate ? new Date(queryDto.startDate) : undefined,
        endDate: queryDto.endDate ? new Date(queryDto.endDate) : undefined,
        hasIssue: queryDto.hasIssue,
        tags: queryDto.tags ? queryDto.tags.split(',').map(t => t.trim()).filter(t => {
          // ============================================
          // SEGURIDAD: Sanitizar cada tag individualmente
          // ============================================
          if (t.length === 0 || t.length >= 50) return false;
          // Eliminar caracteres peligrosos
          const sanitized = t.replace(/[<>\"'&]/g, '');
          return sanitized.length > 0;
        }).slice(0, 10) : undefined, // Máximo 10 tags
      });
    }
    
    return this.ordersService.findAll(user.id, isAdmin);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const isAdmin = user.role === 'ADMIN';
    return this.ordersService.findOne(id, user.id, isAdmin);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    const isAdmin = user.role === 'ADMIN';
    return this.ordersService.update(id, user.id, updateOrderDto, isAdmin, isAdmin ? user.id : undefined);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post(':id/accept-quotation')
  acceptQuotation(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ordersService.acceptQuotation(id, user.id);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(
      id,
      user.id,
      updateStatusDto.status,
      updateStatusDto.notes,
      updateStatusDto.trackingNumber,
    );
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Patch(':id/issue')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  updateIssue(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { hasIssue: boolean; issueDescription?: string },
  ) {
    const isAdmin = user.role === 'ADMIN';
    return this.ordersService.update(id, user.id, {
      hasIssue: body.hasIssue,
      issueDescription: body.issueDescription,
    }, isAdmin, isAdmin ? user.id : undefined);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Patch(':id/tags')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  updateTags(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { tags: string[] },
  ) {
    // ============================================
    // SEGURIDAD: Validar tamaño máximo de arrays
    // ============================================
    if (body.tags && body.tags.length > 10) {
      throw new BadRequestException('Máximo 10 tags permitidos');
    }

    const isAdmin = user.role === 'ADMIN';
    return this.ordersService.update(id, user.id, {
      tags: body.tags,
    }, isAdmin, isAdmin ? user.id : undefined);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    const isAdmin = user.role === 'ADMIN';
    return this.ordersService.remove(id, user.id, isAdmin);
  }
}

