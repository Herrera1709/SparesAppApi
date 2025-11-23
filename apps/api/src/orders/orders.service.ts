import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus, Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { ProductExtractorService } from '../product-extractor/product-extractor.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    private auditService: AuditService,
    private productExtractorService: ProductExtractorService,
    private inventoryService: InventoryService,
  ) {}

  async create(userId: string, createOrderDto: CreateOrderDto) {
    // Intentar extraer información del producto automáticamente
    let extractedProductInfo = null;
    let itemName = createOrderDto.itemName;
    
    try {
      extractedProductInfo = await this.productExtractorService.extractProductInfo(createOrderDto.externalLink);
      
      // Usar el título extraído si no se proporcionó uno
      if (!itemName && extractedProductInfo.title) {
        itemName = extractedProductInfo.title;
      }
      
      // Si se extrajo precio, usarlo como referencia inicial
      // (aunque el admin lo confirmará después)
    } catch (error) {
      // Si falla la extracción, continuar sin la información extraída
      // No es crítico, el admin puede completar la información después
      this.logger.warn('No se pudo extraer información del producto automáticamente');
    }

    // Obtener el casillero activo por defecto si no se especifica
    let lockerId = createOrderDto.lockerId;
    if (!lockerId) {
      const activeLocker = await this.prisma.locker.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      lockerId = activeLocker?.id;
    }

    // Calcular precios iniciales (esto se actualizará después por el admin)
    // Si se extrajo precio, usarlo como referencia
    const initialPrice = extractedProductInfo?.price 
      ? new Prisma.Decimal(extractedProductInfo.price)
      : new Prisma.Decimal(0);
    
    const itemPrice = initialPrice;
    const shippingCost = new Prisma.Decimal(0);
    const taxes = new Prisma.Decimal(0);
    const serviceFee = new Prisma.Decimal(0);
    const totalPrice = new Prisma.Decimal(0);

    const order = await this.prisma.order.create({
      data: {
        externalLink: createOrderDto.externalLink,
        itemName: itemName || createOrderDto.itemName,
        quantity: createOrderDto.quantity || 1,
        notes: createOrderDto.notes,
        itemPrice,
        shippingCost,
        taxes,
        serviceFee,
        totalPrice,
        status: OrderStatus.CREATED,
        user: {
          connect: { id: userId },
        },
        ...(createOrderDto.addressId && {
          address: {
            connect: { id: createOrderDto.addressId },
          },
        }),
        ...(lockerId && {
          locker: {
            connect: { id: lockerId },
          },
        }),
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
        locker: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    // Crear entrada inicial en el historial
    await this.prisma.orderStatusHistory.create({
      data: {
        status: OrderStatus.CREATED,
        notes: 'Pedido creado por el usuario',
        order: {
          connect: { id: order.id },
        },
      },
    });

    // Notificar al usuario
    this.notificationsService.notifyOrderCreated(order.id).catch(err => {
      this.logger.error('Error enviando notificación de pedido creado:', err);
    });

    return order;
  }

  async findAll(userId: string, isAdmin: boolean = false) {
    const where = isAdmin ? {} : { userId };

    // ============================================
    // SEGURIDAD: Limitar resultados para prevenir DoS
    // ============================================
    return this.prisma.order.findMany({
      where,
      take: 100, // Máximo 100 órdenes por request
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
        locker: true,
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
        locker: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' }, // Orden ascendente para timeline
          include: {
            changedByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        payments: true, // Incluir pagos
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

  async update(id: string, userId: string, updateOrderDto: UpdateOrderDto, isAdmin: boolean = false, adminId?: string) {
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
          status: updateOrderDto.status,
          notes: updateOrderDto.notes || `Estado cambiado a ${updateOrderDto.status}`,
          order: {
            connect: { id },
          },
          ...(isAdmin && adminId && {
            changedByUser: {
              connect: { id: adminId },
            },
          }),
        },
      });
    }

    // Calcular total si se actualizan los precios
    let totalPrice = order.totalPrice;
    let shouldQuote = false;
    
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
      
      // Si el admin está actualizando precios y el pedido no está cotizado aún, marcar como cotizado
      if (isAdmin && (order.status === OrderStatus.CREATED || order.status === OrderStatus.REQUESTED)) {
        shouldQuote = true;
      }
    }

    // Si se está cotizando, actualizar campos de cotización
    const updateData: any = {
      ...updateOrderDto,
      totalPrice,
    };

    if (shouldQuote) {
      updateData.status = OrderStatus.QUOTED;
      updateData.quotedAt = new Date();
      // Cotización válida por 7 días por defecto
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 7);
      updateData.quotationExpiresAt = expirationDate;
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: updateData,
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
        locker: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' }, // Orden ascendente para timeline
          take: 10,
          include: {
            changedByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        payments: true, // Incluir pagos
      },
    });

    // Si se cotizó, crear entrada en el historial
    if (shouldQuote) {
      await this.prisma.orderStatusHistory.create({
        data: {
          status: OrderStatus.QUOTED,
          notes: 'Pedido cotizado por el administrador',
          order: {
            connect: { id },
          },
          ...(isAdmin && adminId && {
            changedByUser: {
              connect: { id: adminId },
            },
          }),
        },
      });

      // Registrar en auditoría
      if (isAdmin && adminId) {
        this.auditService.logAction(
          adminId,
          'ORDER',
          id,
          'UPDATE_PRICES_AND_QUOTE',
          {
            status: order.status,
            itemPrice: Number(order.itemPrice),
            shippingCost: Number(order.shippingCost),
            taxes: Number(order.taxes),
            serviceFee: Number(order.serviceFee),
            totalPrice: Number(order.totalPrice),
          },
          {
            status: OrderStatus.QUOTED,
            itemPrice: Number(updateData.itemPrice ?? order.itemPrice),
            shippingCost: Number(updateData.shippingCost ?? order.shippingCost),
            taxes: Number(updateData.taxes ?? order.taxes),
            serviceFee: Number(updateData.serviceFee ?? order.serviceFee),
            totalPrice: Number(updateData.totalPrice),
            quotedAt: updateData.quotedAt,
            quotationExpiresAt: updateData.quotationExpiresAt,
          },
        ).catch(err => this.logger.error('Error registrando auditoría:', err));
      }

      // Notificar al usuario
      this.notificationsService.notifyQuotationReady(id).catch(err => {
        this.logger.error('Error enviando notificación de cotización:', err);
      });
    } else if (isAdmin && adminId) {
      // Registrar actualización de precios sin cotización
      this.auditService.logAction(
        adminId,
        'ORDER',
        id,
        'UPDATE_PRICES',
        {
          itemPrice: Number(order.itemPrice),
          shippingCost: Number(order.shippingCost),
          taxes: Number(order.taxes),
          serviceFee: Number(order.serviceFee),
          totalPrice: Number(order.totalPrice),
        },
        {
          itemPrice: Number(updateData.itemPrice ?? order.itemPrice),
          shippingCost: Number(updateData.shippingCost ?? order.shippingCost),
          taxes: Number(updateData.taxes ?? order.taxes),
          serviceFee: Number(updateData.serviceFee ?? order.serviceFee),
          totalPrice: Number(updateData.totalPrice),
        },
      ).catch(err => this.logger.error('Error registrando auditoría:', err));
    }

    // Registrar cambios de incidencias
    if (isAdmin && adminId && (updateOrderDto.hasIssue !== undefined || updateOrderDto.issueDescription !== undefined)) {
      this.auditService.logAction(
        adminId,
        'ORDER',
        id,
        updateOrderDto.hasIssue ? 'MARK_ISSUE' : 'CLEAR_ISSUE',
        {
          hasIssue: order.hasIssue,
          issueDescription: order.issueDescription,
        },
        {
          hasIssue: updateOrderDto.hasIssue ?? order.hasIssue,
          issueDescription: updateOrderDto.issueDescription ?? order.issueDescription,
        },
      ).catch(err => this.logger.error('Error registrando auditoría:', err));
    }

    return updatedOrder;
  }

  async acceptQuotation(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para aceptar esta cotización');
    }

    if (order.status !== OrderStatus.QUOTED) {
      throw new BadRequestException('El pedido no está en estado cotizado');
    }

    // Verificar si la cotización está vencida
    if (order.quotationExpiresAt && new Date() > order.quotationExpiresAt) {
      throw new BadRequestException('La cotización ha vencido. Por favor, contacta soporte para actualizarla.');
    }

    // Actualizar pedido
    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.PAYMENT_PENDING,
        acceptedAt: new Date(),
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
        locker: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: {
            changedByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        payments: true, // Incluir pagos
      },
    });

    // Crear entrada en el historial
    await this.prisma.orderStatusHistory.create({
      data: {
        status: OrderStatus.PAYMENT_PENDING,
        notes: 'Cotización aceptada por el usuario',
        order: {
          connect: { id },
        },
      },
    });

    // Notificar al usuario
    this.notificationsService.notifyPaymentPending(id).catch(err => {
      this.logger.error('Error enviando notificación de pago pendiente:', err);
    });

    return updatedOrder;
  }

  async updateStatus(id: string, adminId: string, status: OrderStatus, notes?: string, trackingNumber?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    // Crear entrada en el historial
    await this.prisma.orderStatusHistory.create({
      data: {
        status,
        notes: notes || `Estado cambiado a ${status}`,
        order: {
          connect: { id },
        },
        changedByUser: {
          connect: { id: adminId },
        },
      },
    });

    // Registrar en auditoría
    this.auditService.logAction(
      adminId,
      'ORDER',
      id,
      'UPDATE_STATUS',
      { status: order.status },
      { status, notes, trackingNumber },
    ).catch(err => console.error('Error registrando auditoría:', err));

    // Actualizar el pedido
    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        status,
        trackingNumber: trackingNumber || order.trackingNumber,
      },
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
        locker: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' }, // Orden ascendente para timeline
          include: {
            changedByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        payments: true, // Incluir pagos
        product: true, // Incluir producto si está relacionado
      },
    });

    // Si el estado cambió a DELIVERED y hay un producto relacionado, descontar del inventario
    if (status === OrderStatus.DELIVERED && order.status !== OrderStatus.DELIVERED) {
      if (updatedOrder.productId && updatedOrder.product) {
        try {
          await this.inventoryService.deductInventoryForOrder(
            id,
            updatedOrder.productId,
            updatedOrder.quantity,
            adminId,
          );
        } catch (error) {
          // Log el error pero no fallar la actualización del estado
          console.error('Error descontando inventario al entregar orden:', error);
          // Opcionalmente, podrías revertir el estado o notificar al admin
        }
      }
    }

    // Notificar cambio de estado importante
    this.notificationsService.notifyOrderStatusChanged(id, status).catch(err => {
      this.logger.error('Error enviando notificación de cambio de estado:', err);
    });

    return updatedOrder;
  }

  async findAllWithFilters(filters: {
    status?: OrderStatus;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    hasIssue?: boolean;
    tags?: string[];
  }) {
    // ============================================
    // SEGURIDAD: Validar userId es UUID válido
    // ============================================
    if (filters.userId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filters.userId)) {
      throw new BadRequestException('userId debe ser un UUID válido');
    }

    // ============================================
    // SEGURIDAD: Validar fechas
    // ============================================
    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      throw new BadRequestException('La fecha de inicio no puede ser mayor que la fecha de fin');
    }

    // ============================================
    // SEGURIDAD: Limitar tags
    // ============================================
    if (filters.tags && filters.tags.length > 10) {
      throw new BadRequestException('Máximo 10 tags permitidos');
    }

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.hasIssue !== undefined) {
      where.hasIssue = filters.hasIssue;
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags,
      };
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    // ============================================
    // SEGURIDAD: Límite de resultados para prevenir DoS
    // ============================================
    return this.prisma.order.findMany({
      where,
      take: 100, // Máximo 100 resultados
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
        locker: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          take: 1, // Solo el último estado
        },
      },
      orderBy: { createdAt: 'desc' },
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

