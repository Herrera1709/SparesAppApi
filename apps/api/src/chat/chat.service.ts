import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ChatStatus } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async createConversation(userId: string | null, createConversationDto: CreateConversationDto) {
    // Si el usuario está autenticado, usar sus datos
    let userData: any = {};
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, firstName: true, lastName: true, phone: true },
      });
      if (user) {
        userData.userId = user.id;
        userData.guestName = user.firstName || user.email;
        userData.guestEmail = user.email;
        userData.guestPhone = user.phone;
      }
    } else {
      // Usuario no autenticado, usar datos del DTO
      if (!createConversationDto.guestName || !createConversationDto.guestEmail) {
        throw new BadRequestException('Nombre y email son requeridos para usuarios no registrados');
      }
      userData.guestName = createConversationDto.guestName;
      userData.guestEmail = createConversationDto.guestEmail;
      userData.guestPhone = createConversationDto.guestPhone;
    }

    // Calcular fecha de expiración (5 minutos después de la creación)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutos

    // Crear conversación
    const conversation = await this.prisma.chatConversation.create({
      data: {
        ...userData,
        subject: createConversationDto.subject || null,
        status: ChatStatus.OPEN,
        lastActivityAt: now,
        expiresAt: expiresAt,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });

    // Crear mensaje inicial
    if (createConversationDto.initialMessage) {
      await this.prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: userId || null,
          isFromAdmin: false,
          isSystem: false,
          content: createConversationDto.initialMessage,
        },
      });

      // Actualizar lastMessageAt y lastActivityAt
      const now = new Date();
      await this.prisma.chatConversation.update({
        where: { id: conversation.id },
        data: { 
          lastMessageAt: now,
          lastActivityAt: now,
          // Extender expiración si la conversación estaba por expirar
          expiresAt: new Date(now.getTime() + 5 * 60 * 1000), // 5 minutos más
        },
      });
    }

    return this.getConversation(conversation.id, userId);
  }

  async getConversation(conversationId: string, userId: string | null, showRecentOnly: boolean = false) {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        admin: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    // Verificar permisos
    if (userId) {
      // Usuario autenticado: solo puede ver sus propias conversaciones o si es admin
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      const isAdmin = user?.role === 'ADMIN';
      if (!isAdmin && conversation.userId !== userId) {
        throw new ForbiddenException('No tienes permiso para ver esta conversación');
      }
    } else {
      // Usuario no autenticado: puede ver conversaciones de invitados (sin userId)
      // En producción, podrías verificar el email o usar un token temporal
      if (conversation.userId) {
        throw new ForbiddenException('No tienes permiso para ver esta conversación');
      }
    }

    // Verificar si la conversación expiró
    const now = new Date();
    if (conversation.expiresAt && conversation.expiresAt < now) {
      // Cerrar conversación expirada
      await this.prisma.chatConversation.update({
        where: { id: conversationId },
        data: { status: ChatStatus.CLOSED },
      });
      conversation.status = ChatStatus.CLOSED;
    }

    // Si showRecentOnly es true y no es admin, mostrar solo mensajes de los últimos 10 minutos
    if (showRecentOnly && userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      const isAdmin = user?.role === 'ADMIN';
      
      if (!isAdmin) {
        const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
        conversation.messages = conversation.messages.filter(
          msg => new Date(msg.createdAt) >= tenMinutesAgo
        );
      }
    }

    return conversation;
  }

  async getUserConversations(userId: string | null) {
    if (userId) {
      // Usuario autenticado
      const conversations = await this.prisma.chatConversation.findMany({
        where: { userId },
        include: {
          admin: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { lastMessageAt: 'desc' },
      });

      // Verificar y cerrar conversaciones expiradas
      const now = new Date();
      for (const conversation of conversations) {
        if (conversation.expiresAt && new Date(conversation.expiresAt) < now && conversation.status !== ChatStatus.CLOSED) {
          await this.prisma.chatConversation.update({
            where: { id: conversation.id },
            data: { status: ChatStatus.CLOSED },
          });
          conversation.status = ChatStatus.CLOSED;
        }
      }

      return conversations;
    } else {
      // Usuario no autenticado no puede listar conversaciones sin email
      return [];
    }
  }

  async getAdminConversations(adminId: string, filters?: { status?: ChatStatus; unassigned?: boolean }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.unassigned) {
      where.adminId = null;
    } else {
      // Mostrar conversaciones asignadas al admin o sin asignar
      where.OR = [
        { adminId },
        { adminId: null },
      ];
    }

    return this.prisma.chatConversation.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        admin: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async sendMessage(conversationId: string, senderId: string | null, sendMessageDto: SendMessageDto, isAdmin: boolean = false) {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    // Verificar si la conversación está cerrada
    if (conversation.status === ChatStatus.CLOSED) {
      throw new BadRequestException('No puedes enviar mensajes a una conversación cerrada. Por favor, inicia una nueva conversación.');
    }

    // Verificar si la conversación expiró
    const now = new Date();
    if (conversation.expiresAt && new Date(conversation.expiresAt) < now) {
      // Cerrar automáticamente si expiró
      await this.prisma.chatConversation.update({
        where: { id: conversationId },
        data: { status: ChatStatus.CLOSED },
      });
      throw new BadRequestException('Esta conversación ha expirado por inactividad. Por favor, inicia una nueva conversación.');
    }

    // Reutilizar la variable 'now' más adelante

    // Verificar permisos
    if (senderId) {
      const user = await this.prisma.user.findUnique({
        where: { id: senderId },
        select: { role: true },
      });
      const userIsAdmin = user?.role === 'ADMIN';
      
      if (!userIsAdmin && conversation.userId !== senderId) {
        throw new ForbiddenException('No tienes permiso para enviar mensajes en esta conversación');
      }
    } else {
      // Usuario no autenticado solo puede enviar si la conversación no tiene userId (es de invitado)
      // O si puede verificar que es su conversación por email (esto requeriría pasar el email)
      // Por ahora, permitimos que usuarios no autenticados envíen mensajes a conversaciones sin userId
      if (conversation.userId) {
        throw new ForbiddenException('No tienes permiso para enviar mensajes en esta conversación');
      }
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        senderId: senderId || null,
        isFromAdmin: isAdmin,
        isSystem: false,
        content: sendMessageDto.content,
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    // Actualizar lastMessageAt, lastActivityAt y extender expiración
    // Reutilizar la variable 'now' declarada anteriormente
    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { 
        lastMessageAt: now,
        lastActivityAt: now,
        // Extender expiración a 5 minutos desde ahora
        expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
        // Mantener el status actual (ya verificamos que no está cerrada)
        status: conversation.status,
      },
    });

    return message;
  }

  async assignConversation(conversationId: string, adminId: string) {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    return this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        adminId,
        status: ChatStatus.ASSIGNED,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        admin: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async updateConversationStatus(conversationId: string, status: ChatStatus) {
    return this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { status },
    });
  }

  async closeConversation(conversationId: string, userId: string | null) {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    // Verificar permisos: solo el dueño de la conversación o un admin puede cerrarla
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      const isAdmin = user?.role === 'ADMIN';
      
      if (!isAdmin && conversation.userId !== userId) {
        throw new ForbiddenException('No tienes permiso para cerrar esta conversación');
      }
    } else {
      // Usuario no autenticado solo puede cerrar conversaciones sin userId
      if (conversation.userId) {
        throw new ForbiddenException('No tienes permiso para cerrar esta conversación');
      }
    }

    return this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { status: ChatStatus.CLOSED },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        admin: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async markMessageAsRead(messageId: string) {
    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { readAt: new Date() },
    });
  }

  // Horario de asistencia
  async getSupportSchedule() {
    return this.prisma.chatSupportSchedule.findMany({
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async updateSupportSchedule(updateScheduleDto: UpdateScheduleDto) {
    return this.prisma.chatSupportSchedule.upsert({
      where: { dayOfWeek: updateScheduleDto.dayOfWeek },
      update: {
        isActive: updateScheduleDto.isActive,
        startTime: updateScheduleDto.startTime,
        endTime: updateScheduleDto.endTime,
        timezone: updateScheduleDto.timezone || 'America/Costa_Rica',
      },
      create: {
        dayOfWeek: updateScheduleDto.dayOfWeek,
        isActive: updateScheduleDto.isActive,
        startTime: updateScheduleDto.startTime,
        endTime: updateScheduleDto.endTime,
        timezone: updateScheduleDto.timezone || 'America/Costa_Rica',
      },
    });
  }

  async isSupportAvailable(): Promise<{ available: boolean; message: string }> {
    const schedules = await this.getSupportSchedule();
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Domingo, 6 = Sábado
    const currentTime = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

    const todaySchedule = schedules.find(s => s.dayOfWeek === dayOfWeek && s.isActive);

    if (!todaySchedule) {
      return {
        available: false,
        message: 'El soporte no está disponible hoy. Por favor, intenta en otro momento.',
      };
    }

    const [startHour, startMinute] = todaySchedule.startTime.split(':').map(Number);
    const [endHour, endMinute] = todaySchedule.endTime.split(':').map(Number);
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);

    const currentMinutes = currentHour * 60 + currentMinute;
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      return {
        available: true,
        message: 'Soporte disponible',
      };
    }

    return {
      available: false,
      message: `El soporte está disponible de ${todaySchedule.startTime} a ${todaySchedule.endTime}.`,
    };
  }
}

