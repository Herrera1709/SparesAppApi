import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketStatus } from '@prisma/client';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createTicketDto: CreateTicketDto) {
    // Verificar que el pedido existe y pertenece al usuario
    const order = await this.prisma.order.findUnique({
      where: { id: createTicketDto.orderId },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para crear un ticket para este pedido');
    }

    return this.prisma.supportTicket.create({
      data: {
        ...createTicketDto,
        userId,
      },
      include: {
        order: {
          select: {
            id: true,
            itemName: true,
            status: true,
            totalPrice: true,
          },
        },
        user: {
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

  async findAll(userId: string, isAdmin: boolean = false) {
    const where = isAdmin ? {} : { userId };

    return this.prisma.supportTicket.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            itemName: true,
            status: true,
            totalPrice: true,
          },
        },
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
          take: 5, // Últimos 5 mensajes
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllWithFilters(filters: {
    status?: TicketStatus;
    orderId?: string;
    userId?: string;
  }) {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.orderId) {
      where.orderId = filters.orderId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    return this.prisma.supportTicket.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            itemName: true,
            status: true,
            totalPrice: true,
          },
        },
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
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string, isAdmin: boolean = false) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            itemName: true,
            status: true,
            totalPrice: true,
            externalLink: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    if (!isAdmin && ticket.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver este ticket');
    }

    return ticket;
  }

  async update(id: string, userId: string, updateTicketDto: UpdateTicketDto, isAdmin: boolean = false) {
    const ticket = await this.findOne(id, userId, isAdmin);

    // Solo admin puede actualizar tickets
    if (!isAdmin) {
      throw new ForbiddenException('Solo los administradores pueden actualizar tickets');
    }

    return this.prisma.supportTicket.update({
      where: { id },
      data: updateTicketDto,
      include: {
        order: {
          select: {
            id: true,
            itemName: true,
            status: true,
            totalPrice: true,
          },
        },
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
        },
      },
    });
  }

  async addMessage(ticketId: string, userId: string, message: string, isAdmin: boolean = false) {
    // Verificar que el ticket existe y el usuario tiene permiso
    const ticket = await this.findOne(ticketId, userId, isAdmin);

    return this.prisma.ticketMessage.create({
      data: {
        ticketId,
        userId: isAdmin ? null : userId, // Si es admin, userId puede ser null
        isAdmin,
        message,
      },
      include: {
        ticket: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
  }
}

