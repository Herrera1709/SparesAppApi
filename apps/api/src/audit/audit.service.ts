import { Injectable } from '@nestjs/common';
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
      take: limit,
    });
  }
}

