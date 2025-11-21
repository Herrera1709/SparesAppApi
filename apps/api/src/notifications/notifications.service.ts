import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private emailService: EmailService,
    private prisma: PrismaService,
  ) {}

  async notifyOrderCreated(orderId: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: true,
        },
      });

      if (!order || !order.user) return;

      await this.emailService.sendWithRetry({
        from: this.emailService['fromEmail'],
        to: order.user.email,
        subject: '✅ Pedido Creado - ImportaCR',
        html: this.getOrderCreatedEmailTemplate(order.user.firstName || 'Usuario', order),
      });

      this.logger.log(`Notificación de pedido creado enviada a ${order.user.email}`);
    } catch (error) {
      this.logger.error(`Error enviando notificación de pedido creado:`, error);
    }
  }

  async notifyQuotationReady(orderId: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: true,
        },
      });

      if (!order || !order.user) return;

      await this.emailService.sendWithRetry({
        from: this.emailService['fromEmail'],
        to: order.user.email,
        subject: '💰 Cotización Lista - ImportaCR',
        html: this.getQuotationReadyEmailTemplate(order.user.firstName || 'Usuario', order),
      });

      this.logger.log(`Notificación de cotización lista enviada a ${order.user.email}`);
    } catch (error) {
      this.logger.error(`Error enviando notificación de cotización:`, error);
    }
  }

  async notifyPaymentPending(orderId: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: true,
        },
      });

      if (!order || !order.user) return;

      await this.emailService.sendWithRetry({
        from: this.emailService['fromEmail'],
        to: order.user.email,
        subject: '💳 Pago Pendiente - ImportaCR',
        html: this.getPaymentPendingEmailTemplate(order.user.firstName || 'Usuario', order),
      });

      this.logger.log(`Notificación de pago pendiente enviada a ${order.user.email}`);
    } catch (error) {
      this.logger.error(`Error enviando notificación de pago pendiente:`, error);
    }
  }

  async notifyPaymentConfirmed(orderId: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: true,
        },
      });

      if (!order || !order.user) return;

      await this.emailService.sendWithRetry({
        from: this.emailService['fromEmail'],
        to: order.user.email,
        subject: '✅ Pago Confirmado - ImportaCR',
        html: this.getPaymentConfirmedEmailTemplate(order.user.firstName || 'Usuario', order),
      });

      this.logger.log(`Notificación de pago confirmado enviada a ${order.user.email}`);
    } catch (error) {
      this.logger.error(`Error enviando notificación de pago confirmado:`, error);
    }
  }

  async notifyOrderStatusChanged(orderId: string, newStatus: OrderStatus) {
    // Solo notificar estados importantes
    const importantStatuses: OrderStatus[] = [
      OrderStatus.ARRIVED_IN_CR,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.DELIVERED,
    ];

    if (!importantStatuses.includes(newStatus)) {
      return;
    }

    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: true,
        },
      });

      if (!order || !order.user) return;

      const statusLabels: Record<OrderStatus, string> = {
        [OrderStatus.CREATED]: 'Creado',
        [OrderStatus.REQUESTED]: 'Solicitado',
        [OrderStatus.QUOTED]: 'Cotizado',
        [OrderStatus.PAYMENT_PENDING]: 'Pago Pendiente',
        [OrderStatus.PAID]: 'Pagado',
        [OrderStatus.PURCHASED_FROM_STORE]: 'Comprado en Tienda',
        [OrderStatus.ARRIVED_AT_FOREIGN_LOCKER]: 'Llegó al Casillero Extranjero',
        [OrderStatus.IN_TRANSIT_TO_CR]: 'En Tránsito a Costa Rica',
        [OrderStatus.ARRIVED_IN_CR]: 'Llegó a Costa Rica',
        [OrderStatus.IN_CUSTOMS]: 'En Aduanas',
        [OrderStatus.RELEASED_FROM_CUSTOMS]: 'Liberado de Aduanas',
        [OrderStatus.IN_NATIONAL_LOCKER]: 'En Casillero Nacional',
        [OrderStatus.OUT_FOR_DELIVERY]: 'En Ruta de Entrega',
        [OrderStatus.DELIVERED]: 'Entregado',
        [OrderStatus.CANCELLED]: 'Cancelado',
      };

      const statusMessages: Record<OrderStatus, string> = {
        [OrderStatus.ARRIVED_IN_CR]: '¡Tu pedido ha llegado a Costa Rica! Está siendo procesado para su entrega.',
        [OrderStatus.OUT_FOR_DELIVERY]: '¡Tu pedido está en camino! Será entregado pronto.',
        [OrderStatus.DELIVERED]: '¡Tu pedido ha sido entregado exitosamente! Esperamos que disfrutes tu compra.',
        [OrderStatus.CREATED]: '',
        [OrderStatus.REQUESTED]: '',
        [OrderStatus.QUOTED]: '',
        [OrderStatus.PAYMENT_PENDING]: '',
        [OrderStatus.PAID]: '',
        [OrderStatus.PURCHASED_FROM_STORE]: '',
        [OrderStatus.ARRIVED_AT_FOREIGN_LOCKER]: '',
        [OrderStatus.IN_TRANSIT_TO_CR]: '',
        [OrderStatus.IN_CUSTOMS]: '',
        [OrderStatus.RELEASED_FROM_CUSTOMS]: '',
        [OrderStatus.IN_NATIONAL_LOCKER]: '',
        [OrderStatus.CANCELLED]: '',
      };

      await this.emailService.sendWithRetry({
        from: this.emailService['fromEmail'],
        to: order.user.email,
        subject: `📦 Actualización de Pedido - ${statusLabels[newStatus]}`,
        html: this.getStatusChangedEmailTemplate(
          order.user.firstName || 'Usuario',
          order,
          statusLabels[newStatus],
          statusMessages[newStatus],
        ),
      });

      this.logger.log(`Notificación de cambio de estado enviada a ${order.user.email}`);
    } catch (error) {
      this.logger.error(`Error enviando notificación de cambio de estado:`, error);
    }
  }

  private getOrderCreatedEmailTemplate(name: string, order: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 50%, #F97316 100%); border-radius: 12px; padding: 40px; color: white; text-align: center; }
          .content { background: white; border-radius: 8px; padding: 30px; margin-top: 20px; color: #333; }
          .button { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 style="margin: 0;">🌍 ImportaCR</h1>
        </div>
        <div class="content">
          <h2>¡Hola ${name}!</h2>
          <p>Tu pedido ha sido creado exitosamente.</p>
          <p><strong>ID del Pedido:</strong> ${order.id.substring(0, 8)}</p>
          ${order.itemName ? `<p><strong>Artículo:</strong> ${order.itemName}</p>` : ''}
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/orders/${order.id}" class="button">Ver Pedido</a>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getQuotationReadyEmailTemplate(name: string, order: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 50%, #F97316 100%); border-radius: 12px; padding: 40px; color: white; text-align: center; }
          .content { background: white; border-radius: 8px; padding: 30px; margin-top: 20px; color: #333; }
          .button { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .price-box { background: #f0f9ff; border-left: 4px solid #3B82F6; padding: 16px; margin: 20px 0; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 style="margin: 0;">🌍 ImportaCR</h1>
        </div>
        <div class="content">
          <h2>¡Hola ${name}!</h2>
          <p>Tu cotización está lista. Revisa los detalles y acepta cuando estés listo.</p>
          <div class="price-box">
            <p style="margin: 0;"><strong>Total:</strong> $${Number(order.totalPrice).toFixed(2)} USD</p>
            ${order.quotationExpiresAt ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">Válida hasta: ${new Date(order.quotationExpiresAt).toLocaleDateString('es-CR')}</p>` : ''}
          </div>
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/orders/${order.id}" class="button">Ver Cotización</a>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPaymentPendingEmailTemplate(name: string, order: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 50%, #F97316 100%); border-radius: 12px; padding: 40px; color: white; text-align: center; }
          .content { background: white; border-radius: 8px; padding: 30px; margin-top: 20px; color: #333; }
          .button { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 style="margin: 0;">🌍 ImportaCR</h1>
        </div>
        <div class="content">
          <h2>¡Hola ${name}!</h2>
          <p>Tu pedido está pendiente de pago. Completa el pago para continuar con el proceso.</p>
          <p><strong>Monto a pagar:</strong> $${Number(order.totalPrice).toFixed(2)} USD</p>
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/orders/${order.id}" class="button">Realizar Pago</a>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPaymentConfirmedEmailTemplate(name: string, order: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 12px; padding: 40px; color: white; text-align: center; }
          .content { background: white; border-radius: 8px; padding: 30px; margin-top: 20px; color: #333; }
          .button { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 style="margin: 0;">🌍 ImportaCR</h1>
        </div>
        <div class="content">
          <h2>¡Hola ${name}!</h2>
          <p>✅ Tu pago ha sido confirmado exitosamente.</p>
          <p>Tu pedido ahora está en proceso. Te mantendremos informado sobre cada actualización.</p>
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/orders/${order.id}" class="button">Ver Pedido</a>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getStatusChangedEmailTemplate(name: string, order: any, statusLabel: string, message: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 50%, #F97316 100%); border-radius: 12px; padding: 40px; color: white; text-align: center; }
          .content { background: white; border-radius: 8px; padding: 30px; margin-top: 20px; color: #333; }
          .button { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 style="margin: 0;">🌍 ImportaCR</h1>
        </div>
        <div class="content">
          <h2>¡Hola ${name}!</h2>
          <p><strong>Estado actual:</strong> ${statusLabel}</p>
          <p>${message}</p>
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/orders/${order.id}" class="button">Ver Detalles</a>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

