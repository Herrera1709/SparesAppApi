import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Al arrancar la API: asegura que el primer usuario (el más antiguo por createdAt) tenga siempre rol ADMIN.
 * Así el "usuario 1" (el primero que se registró) es siempre administrador.
 */
@Injectable()
export class AuthBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AuthBootstrapService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      const adminUserId = this.config.get<string>('ADMIN_USER_ID');
      if (adminUserId) {
        const updated = await this.prisma.user.updateMany({
          where: { id: adminUserId },
          data: { role: 'ADMIN' },
        });
        if (updated.count > 0) {
          this.logger.log(`Usuario con ID ${adminUserId} configurado como ADMIN (ADMIN_USER_ID).`);
        }
        return;
      }

      const firstUser = await this.prisma.user.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { id: true, email: true, role: true },
      });

      if (!firstUser) return;

      if (firstUser.role === 'ADMIN') return;

      await this.prisma.user.update({
        where: { id: firstUser.id },
        data: { role: 'ADMIN' },
      });

      this.logger.log(`Primer usuario (${firstUser.email}) configurado como ADMIN automáticamente.`);
    } catch (e) {
      this.logger.warn('No se pudo asignar ADMIN al primer usuario:', e?.message || e);
    }
  }
}
