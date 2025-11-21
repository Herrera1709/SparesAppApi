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
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { OrderStatus } from '@prisma/client';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(user.id, createOrderDto);
  }

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: OrderStatus,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('hasIssue') hasIssue?: string,
    @Query('tags') tags?: string,
  ) {
    const isAdmin = user.role === 'ADMIN';
    
    if (isAdmin && (status || userId || startDate || endDate || hasIssue !== undefined || tags)) {
      return this.ordersService.findAllWithFilters({
        status,
        userId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        hasIssue: hasIssue === 'true' ? true : hasIssue === 'false' ? false : undefined,
        tags: tags ? tags.split(',') : undefined,
      });
    }
    
    return this.ordersService.findAll(user.id, isAdmin);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const isAdmin = user.role === 'ADMIN';
    return this.ordersService.findOne(id, user.id, isAdmin);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    const isAdmin = user.role === 'ADMIN';
    return this.ordersService.update(id, user.id, updateOrderDto, isAdmin, isAdmin ? user.id : undefined);
  }

  @Post(':id/accept-quotation')
  acceptQuotation(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ordersService.acceptQuotation(id, user.id);
  }

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

  @Patch(':id/tags')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  updateTags(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { tags: string[] },
  ) {
    const isAdmin = user.role === 'ADMIN';
    return this.ordersService.update(id, user.id, {
      tags: body.tags,
    }, isAdmin, isAdmin ? user.id : undefined);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    const isAdmin = user.role === 'ADMIN';
    return this.ordersService.remove(id, user.id, isAdmin);
  }
}

