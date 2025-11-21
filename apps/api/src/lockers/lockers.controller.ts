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
} from '@nestjs/common';
import { LockersService } from './lockers.service';
import { CreateLockerDto } from './dto/create-locker.dto';
import { UpdateLockerDto } from './dto/update-locker.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('lockers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LockersController {
  constructor(private readonly lockersService: LockersService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() createLockerDto: CreateLockerDto) {
    return this.lockersService.create(createLockerDto);
  }

  @Get()
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.lockersService.findAll(includeInactive === 'true');
  }

  @Get('active')
  findActive() {
    return this.lockersService.findActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.lockersService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() updateLockerDto: UpdateLockerDto) {
    return this.lockersService.update(id, updateLockerDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.lockersService.remove(id);
  }
}

