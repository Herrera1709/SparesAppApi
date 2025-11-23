import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto';
import { GetAdminTicketsQueryDto } from './dto/get-admin-tickets-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TicketStatus } from '@prisma/client';
import { QuerySanitizerInterceptor } from '../common/security/query-sanitizer.interceptor';
import { ParamValidatorPipe } from '../common/security/param-validator.pipe';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
@UseInterceptors(QuerySanitizerInterceptor)
@UsePipes(ParamValidatorPipe)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post()
  create(@CurrentUser() user: any, @Body() createTicketDto: CreateTicketDto) {
    return this.ticketsService.create(user.id, createTicketDto);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get()
  findAll(@CurrentUser() user: any) {
    const isAdmin = user.role === 'ADMIN';
    return this.ticketsService.findAll(user.id, isAdmin);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAllAdmin(@Query() queryDto: GetAdminTicketsQueryDto) {
    return this.ticketsService.findAllWithFilters({
      status: queryDto.status,
      orderId: queryDto.orderId,
      userId: queryDto.userId,
    });
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    const isAdmin = user.role === 'ADMIN';
    return this.ticketsService.findOne(id, user.id, isAdmin);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
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

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post(':id/messages')
  addMessage(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() createMessageDto: CreateTicketMessageDto,
  ) {
    const isAdmin = user.role === 'ADMIN';
    return this.ticketsService.addMessage(id, user.id, createMessageDto.message, isAdmin);
  }
}

