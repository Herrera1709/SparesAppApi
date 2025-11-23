import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { QuerySanitizerInterceptor } from '../common/security/query-sanitizer.interceptor';
import { GetLogsQueryDto } from './dto/get-logs-query.dto';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@UseInterceptors(QuerySanitizerInterceptor)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get('logs')
  getLogs(@Query() queryDto: GetLogsQueryDto) {
    return this.auditService.getLogs(
      {
        adminId: queryDto.adminId,
        entityType: queryDto.entityType,
        entityId: queryDto.entityId,
        action: queryDto.action,
      },
      queryDto.limit || 100,
    );
  }
}


