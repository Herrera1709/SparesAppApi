import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async logAction(
    adminId: string,
    entityType: string,
    entityId: string,
    action: string,
    previousValue?: any,
    newValue?: any,
    notes?: string,
  ) {
    return this.prisma.adminActionLog.create({
      data: {
        adminId,
        entityType,
        entityId,
        action,
        previousValue: previousValue ? JSON.parse(JSON.stringify(previousValue)) : null,
        newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
        notes,
      },
    });
  }

  async getLogs(
    filters?: {
      adminId?: string;
      entityType?: string;
      entityId?: string;
      action?: string;
    },
    limit: number = 100,
  ) {
    // ============================================
    // SEGURIDAD: Validar y limitar parámetros
    // ============================================
    // Limitar máximo de resultados
    const maxLimit = Math.min(limit, 500); // Máximo 500 logs
    if (maxLimit < 1) {
      throw new BadRequestException('El límite debe ser mayor a 0');
    }

    // Validar IDs son UUIDs válidos
    if (filters?.adminId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filters.adminId)) {
      throw new BadRequestException('adminId debe ser un UUID válido');
    }

    if (filters?.entityId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filters.entityId)) {
      throw new BadRequestException('entityId debe ser un UUID válido');
    }

    // Validar entityType y action (limitar longitud)
    if (filters?.entityType && filters.entityType.length > 50) {
      throw new BadRequestException('entityType demasiado largo');
    }

    if (filters?.action && filters.action.length > 50) {
      throw new BadRequestException('action demasiado largo');
    }

    const where: any = {};

    if (filters?.adminId) {
      where.adminId = filters.adminId;
    }

    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters?.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters?.action) {
      where.action = filters.action;
    }

    return this.prisma.adminActionLog.findMany({
      where,
      take: maxLimit,
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

