import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { CreateVehicleVariantDto } from './dto/create-vehicle-variant.dto';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // VEHÍCULOS
  // ============================================

  async create(createVehicleDto: CreateVehicleDto) {
    return this.prisma.vehicle.create({
      data: createVehicleDto,
    });
  }

  async findAll(filters?: { make?: string; model?: string; year?: number; isActive?: boolean }) {
    const where: any = {};

    if (filters?.make) {
      where.make = { contains: filters.make, mode: 'insensitive' };
    }
    if (filters?.model) {
      where.model = { contains: filters.model, mode: 'insensitive' };
    }
    if (filters?.year) {
      where.OR = [
        { yearFrom: null, yearTo: null },
        { yearFrom: { lte: filters.year }, yearTo: { gte: filters.year } },
        { yearFrom: { lte: filters.year }, yearTo: null },
        { yearFrom: null, yearTo: { gte: filters.year } },
      ];
    }
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return this.prisma.vehicle.findMany({
      where,
      include: {
        variants: {
          where: { isActive: true },
        },
        _count: {
          select: { fitments: true },
        },
      },
      orderBy: [
        { make: 'asc' },
        { model: 'asc' },
        { yearFrom: 'asc' },
      ],
    });
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        variants: {
          where: { isActive: true },
        },
        fitments: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    return vehicle;
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto) {
    return this.prisma.vehicle.update({
      where: { id },
      data: updateVehicleDto,
    });
  }

  async remove(id: string) {
    return this.prisma.vehicle.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ============================================
  // MARCAS (MAKES)
  // ============================================

  async getMakes() {
    const makes = await this.prisma.vehicle.findMany({
      where: { isActive: true },
      select: { make: true },
      distinct: ['make'],
      orderBy: { make: 'asc' },
    });

    return makes.map(v => v.make);
  }

  // ============================================
  // MODELOS POR MARCA
  // ============================================

  async getModelsByMake(make: string) {
    const models = await this.prisma.vehicle.findMany({
      where: {
        make: { equals: make, mode: 'insensitive' },
        isActive: true,
      },
      select: { model: true },
      distinct: ['model'],
      orderBy: { model: 'asc' },
    });

    return models.map(v => v.model);
  }

  // ============================================
  // AÑOS POR MARCA Y MODELO
  // ============================================

  async getYearsByMakeAndModel(make: string, model: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        make: { equals: make, mode: 'insensitive' },
        model: { equals: model, mode: 'insensitive' },
        isActive: true,
      },
      select: {
        yearFrom: true,
        yearTo: true,
      },
    });

    // Extraer todos los años únicos
    const years = new Set<number>();
    vehicles.forEach(v => {
      if (v.yearFrom && v.yearTo) {
        for (let year = v.yearFrom; year <= v.yearTo; year++) {
          years.add(year);
        }
      } else if (v.yearFrom) {
        years.add(v.yearFrom);
      } else if (v.yearTo) {
        years.add(v.yearTo);
      }
    });

    return Array.from(years).sort((a, b) => b - a); // Orden descendente (más reciente primero)
  }

  // ============================================
  // VARIANTES DE VEHÍCULO
  // ============================================

  async createVariant(vehicleId: string, createVariantDto: CreateVehicleVariantDto) {
    // Verificar que el vehículo existe
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    return this.prisma.vehicleVariant.create({
      data: {
        ...createVariantDto,
        vehicleId,
      },
    });
  }

  async getVariantsByVehicle(vehicleId: string) {
    return this.prisma.vehicleVariant.findMany({
      where: {
        vehicleId,
        isActive: true,
      },
      orderBy: [
        { trim: 'asc' },
        { engine: 'asc' },
      ],
    });
  }

  async findVehicleByMakeModelYear(make: string, model: string, year: number) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        make: { equals: make, mode: 'insensitive' },
        model: { equals: model, mode: 'insensitive' },
        isActive: true,
        OR: [
          { yearFrom: null, yearTo: null },
          { yearFrom: { lte: year }, yearTo: { gte: year } },
          { yearFrom: { lte: year }, yearTo: null },
          { yearFrom: null, yearTo: { gte: year } },
        ],
      },
      include: {
        variants: {
          where: { isActive: true },
        },
      },
    });

    return vehicle;
  }
}

