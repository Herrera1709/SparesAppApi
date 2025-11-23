import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ParamValidatorPipe } from '../common/security/param-validator.pipe';

@Controller('addresses')
@UseGuards(JwtAuthGuard)
@UsePipes(ParamValidatorPipe)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post()
  create(@CurrentUser() user: any, @Body() createAddressDto: CreateAddressDto) {
    return this.addressesService.create(user.id, createAddressDto);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get()
  findAll(@CurrentUser() user: any) {
    return this.addressesService.findAll(user.id);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.addressesService.findOne(id, user.id);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    return this.addressesService.update(id, user.id, updateAddressDto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.addressesService.remove(id, user.id);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post(':id/set-default')
  setDefault(@CurrentUser() user: any, @Param('id') id: string) {
    return this.addressesService.setDefault(id, user.id);
  }
}
