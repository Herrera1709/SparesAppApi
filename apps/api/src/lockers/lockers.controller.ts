import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { LockersService } from './lockers.service';
import { CreateLockerDto } from './dto/create-locker.dto';
import { UpdateLockerDto } from './dto/update-locker.dto';
import { GetLockersQueryDto } from './dto/get-lockers-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { QuerySanitizerInterceptor } from '../common/security/query-sanitizer.interceptor';
import { ParamValidatorPipe } from '../common/security/param-validator.pipe';

@Controller('lockers')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(QuerySanitizerInterceptor)
@UsePipes(ParamValidatorPipe)
export class LockersController {
  constructor(private readonly lockersService: LockersService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post()
  @Roles('ADMIN')
  create(@Body() createLockerDto: CreateLockerDto) {
    return this.lockersService.create(createLockerDto);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get()
  findAll(@Query() queryDto: GetLockersQueryDto) {
    return this.lockersService.findAll(queryDto.includeInactive === true);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get('active')
  findActive() {
    return this.lockersService.findActive();
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.lockersService.findOne(id);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() updateLockerDto: UpdateLockerDto) {
    return this.lockersService.update(id, updateLockerDto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.lockersService.remove(id);
  }
}

