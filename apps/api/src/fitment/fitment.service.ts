import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFitmentDto } from './dto/create-fitment.dto';
import { UpdateFitmentDto } from './dto/update-fitment.dto';

@Injectable()
export class FitmentService {
  constructor(private prisma: PrismaService) {}

  async create(createFitmentDto: CreateFitmentDto) {
    // Verificar que el producto existe
    const product = await this.prisma.product.findUnique({
      where: { id: createFitmentDto.productId },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Verificar que el vehículo o variante existe
    if (createFitmentDto.vehicleVariantId) {
      const variant = await this.prisma.vehicleVariant.findUnique({
        where: { id: createFitmentDto.vehicleVariantId },
      });
      if (!variant) {
        throw new NotFoundException('Variante de vehículo no encontrada');
      }
    } else if (createFitmentDto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: createFitmentDto.vehicleId },
      });
      if (!vehicle) {
        throw new NotFoundException('Vehículo no encontrado');
      }
    }

    return this.prisma.partFitment.create({
      data: createFitmentDto,
      include: {
        product: true,
        vehicle: true,
        vehicleVariant: true,
      },
    });
  }

  async findAll(filters?: {
    productId?: string;
    vehicleId?: string;
    vehicleVariantId?: string;
    isActive?: boolean;
  }) {
    const where: any = {};

    if (filters?.productId) {
      where.productId = filters.productId;
    }
    if (filters?.vehicleId) {
      where.vehicleId = filters.vehicleId;
    }
    if (filters?.vehicleVariantId) {
      where.vehicleVariantId = filters.vehicleVariantId;
    }
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return this.prisma.partFitment.findMany({
      where,
      include: {
        product: true,
        vehicle: true,
        vehicleVariant: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const fitment = await this.prisma.partFitment.findUnique({
      where: { id },
      include: {
        product: true,
        vehicle: true,
        vehicleVariant: true,
      },
    });

    if (!fitment) {
      throw new NotFoundException('Compatibilidad no encontrada');
    }

    return fitment;
  }

  async update(id: string, updateFitmentDto: UpdateFitmentDto) {
    return this.prisma.partFitment.update({
      where: { id },
      data: updateFitmentDto,
      include: {
        product: true,
        vehicle: true,
        vehicleVariant: true,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.partFitment.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ============================================
  // BULK OPERATIONS (Para importación masiva)
  // ============================================

  async createBulk(fitments: CreateFitmentDto[]) {
    // Validar que todos los productos y vehículos existen
    const productIds = [...new Set(fitments.map(f => f.productId))];
    const vehicleIds = [...new Set(fitments.map(f => f.vehicleId).filter(Boolean))];
    const variantIds = [...new Set(fitments.map(f => f.vehicleVariantId).filter(Boolean))];

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('Algunos productos no existen');
    }

    if (vehicleIds.length > 0) {
      const vehicles = await this.prisma.vehicle.findMany({
        where: { id: { in: vehicleIds } },
        select: { id: true },
      });
      if (vehicles.length !== vehicleIds.length) {
        throw new NotFoundException('Algunos vehículos no existen');
      }
    }

    if (variantIds.length > 0) {
      const variants = await this.prisma.vehicleVariant.findMany({
        where: { id: { in: variantIds } },
        select: { id: true },
      });
      if (variants.length !== variantIds.length) {
        throw new NotFoundException('Algunas variantes no existen');
      }
    }

    // Crear todas las compatibilidades
    return this.prisma.partFitment.createMany({
      data: fitments,
      skipDuplicates: true,
    });
  }
}

