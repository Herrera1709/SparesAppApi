import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ChatStatus } from '@prisma/client';
import { Request } from 'express';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // Endpoint público para crear conversación (con o sin autenticación)
  @Post('conversations')
  @UseGuards(OptionalJwtAuthGuard)
  async createConversation(
    @Body() createConversationDto: CreateConversationDto,
    @CurrentUser() user?: any,
  ) {
    const userId = user?.id || null;
    return this.chatService.createConversation(userId, createConversationDto);
  }

  // Endpoint público para obtener conversación (con o sin autenticación)
  @Get('conversations/:id')
  @UseGuards(OptionalJwtAuthGuard)
  async getConversation(
    @Param('id') id: string,
    @Query('recent') recent?: string,
    @CurrentUser() user?: any,
  ) {
    const userId = user?.id || null;
    const showRecentOnly = recent === 'true';
    return this.chatService.getConversation(id, userId, showRecentOnly);
  }

  // Endpoint para usuarios autenticados: listar sus conversaciones
  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  async getUserConversations(@CurrentUser() user: any) {
    return this.chatService.getUserConversations(user.id);
  }

  // Endpoint para enviar mensaje (público, pero verifica permisos)
  @Post('conversations/:id/messages')
  @UseGuards(OptionalJwtAuthGuard)
  async sendMessage(
    @Param('id') id: string,
    @Body() sendMessageDto: SendMessageDto,
    @CurrentUser() user?: any,
  ) {
    const userId = user?.id || null;
    const isAdmin = user?.role === 'ADMIN';
    return this.chatService.sendMessage(id, userId, sendMessageDto, isAdmin);
  }

  // Endpoint para que el cliente cierre su propia conversación
  @Patch('conversations/:id/close')
  @UseGuards(OptionalJwtAuthGuard)
  async closeConversation(
    @Param('id') id: string,
    @CurrentUser() user?: any,
  ) {
    const userId = user?.id || null;
    return this.chatService.closeConversation(id, userId);
  }

  // Endpoints de admin
  @Get('admin/conversations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getAdminConversations(
    @CurrentUser() user: any,
    @Query('status') status?: ChatStatus,
    @Query('unassigned') unassigned?: string,
  ) {
    return this.chatService.getAdminConversations(user.id, {
      status,
      unassigned: unassigned === 'true',
    });
  }

  @Patch('admin/conversations/:id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async assignConversation(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.chatService.assignConversation(id, user.id);
  }

  @Patch('admin/conversations/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateConversationStatus(
    @Param('id') id: string,
    @Body() body: { status: ChatStatus },
  ) {
    return this.chatService.updateConversationStatus(id, body.status);
  }

  // Horario de asistencia
  @Get('support-schedule')
  async getSupportSchedule() {
    return this.chatService.getSupportSchedule();
  }

  @Get('support-availability')
  async getSupportAvailability() {
    return this.chatService.isSupportAvailable();
  }

  @Patch('admin/support-schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateSupportSchedule(@Body() updateScheduleDto: UpdateScheduleDto) {
    return this.chatService.updateSupportSchedule(updateScheduleDto);
  }
}

