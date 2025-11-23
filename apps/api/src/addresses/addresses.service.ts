import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createAddressDto: CreateAddressDto) {
    // Validar máximo de 3 direcciones
    const existingAddresses = await this.prisma.address.count({
      where: { userId },
    });

    if (existingAddresses >= 3) {
      throw new BadRequestException('No puedes tener más de 3 direcciones. Elimina una antes de agregar otra.');
    }

    // Si se marca como default, desmarcar los demás
    if (createAddressDto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Si es el primer domicilio, hacerlo default automáticamente
    const isDefault = existingAddresses === 0 || createAddressDto.isDefault || false;

    return this.prisma.address.create({
      data: {
        alias: createAddressDto.alias,
        street: createAddressDto.street,
        references: createAddressDto.references,
        province: createAddressDto.province,
        canton: createAddressDto.canton,
        district: createAddressDto.district,
        postalCode: createAddressDto.postalCode,
        country: createAddressDto.country || 'Costa Rica',
        isDefault,
        user: {
          connect: { id: userId },
        },
      },
    });
  }

  async findAll(userId: string) {
    // ============================================
    // SEGURIDAD: Límite de resultados (máximo 3 direcciones por usuario)
    // ============================================
    return this.prisma.address.findMany({
      where: { userId },
      take: 10, // Límite adicional de seguridad
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(id: string, userId: string) {
    const address = await this.prisma.address.findUnique({
      where: { id },
    });

    if (!address) {
      throw new BadRequestException('Dirección no encontrada');
    }

    if (address.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver esta dirección');
    }

    return address;
  }

  async update(id: string, userId: string, updateAddressDto: UpdateAddressDto) {
    const address = await this.findOne(id, userId);

    // Si se marca como default, desmarcar los demás
    if (updateAddressDto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, id: { not: id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({
      where: { id },
      data: updateAddressDto,
    });
  }

  async remove(id: string, userId: string) {
    const address = await this.findOne(id, userId);

    // Verificar que no sea el último domicilio (mínimo 1)
    const addressCount = await this.prisma.address.count({
      where: { userId },
    });

    if (addressCount <= 1) {
      throw new BadRequestException('No puedes eliminar tu única dirección. Debes tener al menos una dirección activa.');
    }

    // Si era el default, marcar otro como default automáticamente
    if (address.isDefault) {
      const anotherAddress = await this.prisma.address.findFirst({
        where: { userId, id: { not: id } },
        orderBy: { createdAt: 'desc' }, // Tomar la más reciente
      });

      if (anotherAddress) {
        await this.prisma.address.update({
          where: { id: anotherAddress.id },
          data: { isDefault: true },
        });
      }
    }

    return this.prisma.address.delete({
      where: { id },
    });
  }

  async setDefault(id: string, userId: string) {
    await this.findOne(id, userId);

    // Desmarcar todos los demás
    await this.prisma.address.updateMany({
      where: { userId, id: { not: id } },
      data: { isDefault: false },
    });

    // Marcar este como default
    return this.prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });
  }
}
