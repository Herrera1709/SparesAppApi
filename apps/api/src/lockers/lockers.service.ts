import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLockerDto } from './dto/create-locker.dto';
import { UpdateLockerDto } from './dto/update-locker.dto';

@Injectable()
export class LockersService {
  constructor(private prisma: PrismaService) {}

  async create(createLockerDto: CreateLockerDto) {
    return this.prisma.locker.create({
      data: {
        ...createLockerDto,
        isActive: createLockerDto.isActive ?? true,
      },
    });
  }

  async findAll(includeInactive: boolean = false) {
    return this.prisma.locker.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.locker.findUnique({
      where: { id },
    });
  }

  async findActive() {
    return this.prisma.locker.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, updateLockerDto: UpdateLockerDto) {
    return this.prisma.locker.update({
      where: { id },
      data: updateLockerDto,
    });
  }

  async remove(id: string) {
    return this.prisma.locker.delete({
      where: { id },
    });
  }
}

