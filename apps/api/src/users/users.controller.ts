import { Controller, Get, Put, Body, UseGuards, UsePipes } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { ParamValidatorPipe } from '../common/security/param-validator.pipe';

@Controller('users')
@UseGuards(JwtAuthGuard)
@UsePipes(ParamValidatorPipe)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return this.usersService.findOne(user.id);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Put('me')
  async updateProfile(@CurrentUser() user: any, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(user.id, updateUserDto);
  }
}

