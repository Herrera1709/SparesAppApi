import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSinpePaymentDto } from './dto/create-sinpe-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { PaymentMethod, PaymentStatus, OrderStatus, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    private auditService: AuditService,
  ) {}

  /**
   * Genera un código único para SINPE
   */
  private generateSinpeCode(): string {
    // Genera un código corto y único (ej: IMP-ABC123)
    const prefix = 'IMP';
    const randomPart = uuidv4().substring(0, 8).toUpperCase();
    return `${prefix}-${randomPart}`;
  }

  /**
   * Crea un pago SINPE para un pedido
   */
  async createSinpePayment(orderId: string, userId: string, createSinpePaymentDto: CreateSinpePaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para crear un pago para esta orden');
    }

    if (order.status !== OrderStatus.PAYMENT_PENDING) {
      throw new BadRequestException('El pedido debe estar en estado PAYMENT_PENDING para crear un pago');
    }

    // Verificar si ya existe un pago pendiente
    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        orderId,
        status: PaymentStatus.PENDING,
      },
    });

    if (existingPayment) {
      throw new BadRequestException('Ya existe un pago pendiente para esta orden');
    }

    const sinpeCode = this.generateSinpeCode();

    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        method: PaymentMethod.SINPE,
        amount: order.totalPrice,
        currency: createSinpePaymentDto.currency || 'USD',
        status: PaymentStatus.PENDING,
        sinpeCode,
      },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Actualizar el pedido con el método de pago
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentMethod: PaymentMethod.SINPE,
        paymentStatus: PaymentStatus.PENDING,
      },
    });

    return payment;
  }

  /**
   * Obtiene los pagos de un pedido
   */
  async getPaymentsByOrder(orderId: string, userId: string, isAdmin: boolean = false) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (!isAdmin && order.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver los pagos de esta orden');
    }

    return this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Confirma un pago (solo admin)
   */
  async confirmPayment(paymentId: string, adminId: string, confirmPaymentDto: ConfirmPaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('El pago no está en estado PENDING');
    }

    // Actualizar el pago
    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.CONFIRMED,
        confirmedAt: new Date(),
        sinpeReference: confirmPaymentDto.sinpeReference,
      },
    });

    // Actualizar el pedido
    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: {
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.CONFIRMED,
      },
    });

    // Crear entrada en el historial
    await this.prisma.orderStatusHistory.create({
      data: {
        orderId: payment.orderId,
        status: OrderStatus.PAID,
        notes: `Pago confirmado. Referencia SINPE: ${confirmPaymentDto.sinpeReference || 'N/A'}`,
        changedBy: adminId,
      },
    });

    // Registrar en auditoría
    this.auditService.logAction(
      adminId,
      'PAYMENT',
      paymentId,
      'CONFIRM_PAYMENT',
      {
        status: payment.status,
        amount: Number(payment.amount),
      },
      {
        status: PaymentStatus.CONFIRMED,
        amount: Number(payment.amount),
        sinpeReference: confirmPaymentDto.sinpeReference,
        confirmedAt: new Date(),
      },
      `Pago confirmado. Referencia: ${confirmPaymentDto.sinpeReference || 'N/A'}`,
    ).catch(err => console.error('Error registrando auditoría:', err));

    // Notificar al usuario
    this.notificationsService.notifyPaymentConfirmed(payment.orderId).catch(err => {
      console.error('Error enviando notificación de pago confirmado:', err);
    });

    return updatedPayment;
  }

  /**
   * Marca un pago como fallido (solo admin)
   */
  async failPayment(paymentId: string, adminId: string, reason?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.FAILED,
        failedAt: new Date(),
        metadata: reason ? { reason } : undefined,
      },
    });
  }

  /**
   * Obtiene un pago por ID
   */
  async findOne(paymentId: string, userId: string, isAdmin: boolean = false) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (!isAdmin && payment.order.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver este pago');
    }

    return payment;
  }
}
