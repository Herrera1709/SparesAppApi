import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ChatStatus, ChatConversation } from '@prisma/client';

// TTL por defecto en minutos (se usará si no hay configuración en BD)
const DEFAULT_CHAT_TTL_MINUTES = 5;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  constructor(private prisma: PrismaService) {}

  /**
   * Obtiene el TTL del chat en milisegundos desde la configuración de la BD.
   * Si no existe configuración, usa el valor por defecto.
   */
  private async getChatTTLMs(): Promise<number> {
    try {
      const settings = await this.prisma.chatSettings.findUnique({
        where: { key: 'chat_ttl_minutes' },
      });
      
      if (settings) {
        const ttlMinutes = parseInt(settings.value, 10);
        // Validar que esté en rango razonable (1-60 minutos)
        if (ttlMinutes >= 1 && ttlMinutes <= 60) {
          return ttlMinutes * 60 * 1000; // Convertir minutos a milisegundos
        }
      }
    } catch (error) {
      this.logger.error('Error obteniendo TTL del chat:', error);
    }
    
    // Si no hay configuración o hay error, usar valor por defecto
    return DEFAULT_CHAT_TTL_MINUTES * 60 * 1000;
  }

  /**
   * Función central para manejar la expiración de conversaciones.
   * Esta es la ÚNICA función que decide si una conversación ha expirado y la cierra.
   */
  private async handleExpiration<T extends ChatConversation & { user?: any; admin?: any; messages?: any[] }>(
    conversation: T
  ): Promise<T> {
    // Si ya está cerrada, devolver tal cual
    if (conversation.status === ChatStatus.CLOSED) {
      return conversation;
    }

    const now = new Date();

    // Si expiresAt es nulo, calcularlo basado en lastActivityAt o createdAt
    if (!conversation.expiresAt) {
      const base = conversation.lastActivityAt || conversation.createdAt || now;
      const chatTTLMs = await this.getChatTTLMs();
      const expiresAt = new Date(base.getTime() + chatTTLMs);
      
      // Actualizar expiresAt en la base de datos
      await this.prisma.chatConversation.update({
        where: { id: conversation.id },
        data: { expiresAt },
      });
      
      conversation.expiresAt = expiresAt;
    }

    // Verificar si ha expirado
    if (conversation.expiresAt && new Date(conversation.expiresAt) <= now) {
      // Cerrar la conversación en la base de datos
      // Nota: closedAt se agregará automáticamente después de ejecutar la migración de Prisma
      await this.prisma.chatConversation.update({
        where: { id: conversation.id },
        data: {
          status: ChatStatus.CLOSED,
        },
      });

      // Actualizar el estado local manteniendo los includes originales
      // Nota: closedAt se agregará al tipo después de ejecutar la migración
      return {
        ...conversation,
        status: ChatStatus.CLOSED,
        closedAt: now,
      } as T;
    }

    // Si no ha expirado, devolver tal cual
    return conversation;
  }

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

    // Calcular fecha de expiración usando TTL configurable
    const now = new Date();
    const chatTTLMs = await this.getChatTTLMs();
    const expiresAt = new Date(now.getTime() + chatTTLMs);

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
      const chatTTLMs = await this.getChatTTLMs();
      await this.prisma.chatConversation.update({
        where: { id: conversation.id },
        data: { 
          lastMessageAt: now,
          lastActivityAt: now,
          // Extender expiración usando TTL configurable
          expiresAt: new Date(now.getTime() + chatTTLMs),
        },
      });
    }

    // Obtener la conversación completa con todos los includes
    const fullConversation = await this.getConversation(conversation.id, userId);
    
    // handleExpiration ya se llama dentro de getConversation, pero lo llamamos explícitamente aquí también
    // para asegurar que el estado esté actualizado antes de devolver
    return await this.handleExpiration(fullConversation);
  }

  async getConversation(conversationId: string, userId: string | null, showRecentOnly: boolean = false) {
    let conversation = await this.prisma.chatConversation.findUnique({
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

    // Usar la función central para manejar la expiración
    conversation = await this.handleExpiration(conversation);

    // Si showRecentOnly es true y no es admin, mostrar solo mensajes de los últimos 10 minutos
    if (showRecentOnly && userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      const isAdmin = user?.role === 'ADMIN';
      
      if (!isAdmin) {
        const now = new Date();
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
      // ============================================
      // SEGURIDAD: Límite de resultados para prevenir DoS
      // ============================================
      const conversations = await this.prisma.chatConversation.findMany({
        where: { userId },
        take: 50, // Máximo 50 conversaciones
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

      // Usar la función central para manejar la expiración de todas las conversaciones
      const processedConversations = await Promise.all(
        conversations.map(conv => this.handleExpiration(conv))
      );

      return processedConversations;
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

    // ============================================
    // SEGURIDAD: Límite de resultados para prevenir DoS
    // ============================================
    const conversations = await this.prisma.chatConversation.findMany({
      where,
      take: 100, // Máximo 100 conversaciones
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

    // Usar la función central para manejar la expiración de todas las conversaciones
    const processedConversations = await Promise.all(
      conversations.map(conv => this.handleExpiration(conv))
    );

    return processedConversations;
  }

  async sendMessage(conversationId: string, senderId: string | null, sendMessageDto: SendMessageDto, isAdmin: boolean = false) {
    let conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    // Usar la función central para manejar la expiración
    conversation = await this.handleExpiration(conversation);

    // Verificar si la conversación está cerrada o expirada
    if (conversation.status === ChatStatus.CLOSED) {
      throw new BadRequestException('Esta conversación ha expirado o está cerrada. Por favor, inicia una nueva conversación.');
    }

    const now = new Date();

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

    // Actualizar lastMessageAt, lastActivityAt y extender expiración usando TTL configurable
    const chatTTLMs = await this.getChatTTLMs();
    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { 
        lastMessageAt: now,
        lastActivityAt: now,
        // Extender expiración usando TTL configurable
        expiresAt: new Date(now.getTime() + chatTTLMs),
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

    const now = new Date();
    return this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { 
        status: ChatStatus.CLOSED,
        // Nota: closedAt se agregará automáticamente después de ejecutar la migración de Prisma
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

  // Gestión de configuración de TTL
  async getChatTTL(): Promise<{ ttlMinutes: number }> {
    try {
      const settings = await this.prisma.chatSettings.findUnique({
        where: { key: 'chat_ttl_minutes' },
      });
      
      if (settings) {
        const ttlMinutes = parseInt(settings.value, 10);
        if (ttlMinutes >= 1 && ttlMinutes <= 60) {
          return { ttlMinutes };
        }
      }
    } catch (error) {
      this.logger.error('Error obteniendo TTL del chat:', error);
    }
    
    // Si no hay configuración, devolver el valor por defecto
    return { ttlMinutes: DEFAULT_CHAT_TTL_MINUTES };
  }

  async updateChatTTL(ttlMinutes: number): Promise<{ ttlMinutes: number }> {
    // Validar rango
    if (ttlMinutes < 1 || ttlMinutes > 60) {
      throw new BadRequestException('El TTL debe estar entre 1 y 60 minutos');
    }

    // Actualizar o crear la configuración
    await this.prisma.chatSettings.upsert({
      where: { key: 'chat_ttl_minutes' },
      update: {
        value: ttlMinutes.toString(),
        description: 'Tiempo de expiración del chat en minutos (TTL)',
        updatedAt: new Date(),
      },
      create: {
        key: 'chat_ttl_minutes',
        value: ttlMinutes.toString(),
        description: 'Tiempo de expiración del chat en minutos (TTL)',
      },
    });

    return { ttlMinutes };
  }
}

