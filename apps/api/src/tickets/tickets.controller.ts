import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TicketStatus } from '@prisma/client';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() createTicketDto: CreateTicketDto) {
    return this.ticketsService.create(user.id, createTicketDto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    const isAdmin = user.role === 'ADMIN';
    return this.ticketsService.findAll(user.id, isAdmin);
  }

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAllAdmin(
    @Query('status') status?: TicketStatus,
    @Query('orderId') orderId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.ticketsService.findAllWithFilters({
      status,
      orderId,
      userId,
    });
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    const isAdmin = user.role === 'ADMIN';
    return this.ticketsService.findOne(id, user.id, isAdmin);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateTicketDto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(id, user.id, updateTicketDto, true);
  }
}

