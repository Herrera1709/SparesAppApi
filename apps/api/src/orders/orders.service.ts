import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus, Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createOrderDto: CreateOrderDto) {
    // Calcular precios iniciales (esto se actualizará después por el admin)
    const itemPrice = new Prisma.Decimal(0);
    const shippingCost = new Prisma.Decimal(0);
    const taxes = new Prisma.Decimal(0);
    const serviceFee = new Prisma.Decimal(0);
    const totalPrice = new Prisma.Decimal(0);

    const order = await this.prisma.order.create({
      data: {
        ...createOrderDto,
        userId,
        itemPrice,
        shippingCost,
        taxes,
        serviceFee,
        totalPrice,
        status: OrderStatus.REQUESTED,
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
        address: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    // Crear entrada inicial en el historial
    await this.prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: OrderStatus.REQUESTED,
        notes: 'Orden creada',
      },
    });

    return order;
  }

  async findAll(userId: string, isAdmin: boolean = false) {
    const where = isAdmin ? {} : { userId };

    return this.prisma.order.findMany({
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
        address: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string, isAdmin: boolean = false) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        address: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (!isAdmin && order.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver esta orden');
    }

    return order;
  }

  async update(id: string, userId: string, updateOrderDto: UpdateOrderDto, isAdmin: boolean = false) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (!isAdmin && order.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para actualizar esta orden');
    }

    // Si el admin está actualizando el estado, crear entrada en el historial
    if (updateOrderDto.status && updateOrderDto.status !== order.status) {
      await this.prisma.orderStatusHistory.create({
        data: {
          orderId: id,
          status: updateOrderDto.status,
          notes: updateOrderDto.notes || `Estado cambiado a ${updateOrderDto.status}`,
        },
      });
    }

    // Calcular total si se actualizan los precios
    let totalPrice = order.totalPrice;
    if (
      updateOrderDto.itemPrice !== undefined ||
      updateOrderDto.shippingCost !== undefined ||
      updateOrderDto.taxes !== undefined ||
      updateOrderDto.serviceFee !== undefined
    ) {
      const itemPrice = updateOrderDto.itemPrice ?? Number(order.itemPrice);
      const shippingCost = updateOrderDto.shippingCost ?? Number(order.shippingCost);
      const taxes = updateOrderDto.taxes ?? Number(order.taxes);
      const serviceFee = updateOrderDto.serviceFee ?? Number(order.serviceFee);
      totalPrice = new Prisma.Decimal(itemPrice + shippingCost + taxes + serviceFee);
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        ...updateOrderDto,
        totalPrice,
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
        address: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  async remove(id: string, userId: string, isAdmin: boolean = false) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (!isAdmin && order.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para eliminar esta orden');
    }

    return this.prisma.order.delete({
      where: { id },
    });
  }
}

