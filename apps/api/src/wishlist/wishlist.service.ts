import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWishlistItemDto } from './dto/create-wishlist-item.dto';
import { UpdateWishlistItemDto } from './dto/update-wishlist-item.dto';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createWishlistItemDto: CreateWishlistItemDto) {
    return this.prisma.wishlistItem.create({
      data: {
        ...createWishlistItemDto,
        userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.wishlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const item = await this.prisma.wishlistItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Item de wishlist no encontrado');
    }

    if (item.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver este item');
    }

    return item;
  }

  async update(id: string, userId: string, updateWishlistItemDto: UpdateWishlistItemDto) {
    const item = await this.findOne(id, userId);

    return this.prisma.wishlistItem.update({
      where: { id },
      data: updateWishlistItemDto,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    return this.prisma.wishlistItem.delete({
      where: { id },
    });
  }
}
