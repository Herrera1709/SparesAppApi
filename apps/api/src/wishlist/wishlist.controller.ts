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
import { WishlistService } from './wishlist.service';
import { CreateWishlistItemDto } from './dto/create-wishlist-item.dto';
import { UpdateWishlistItemDto } from './dto/update-wishlist-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ParamValidatorPipe } from '../common/security/param-validator.pipe';

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
@UsePipes(ParamValidatorPipe)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post()
  create(@CurrentUser() user: any, @Body() createWishlistItemDto: CreateWishlistItemDto) {
    return this.wishlistService.create(user.id, createWishlistItemDto);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get()
  findAll(@CurrentUser() user: any) {
    return this.wishlistService.findAll(user.id);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.wishlistService.findOne(id, user.id);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateWishlistItemDto: UpdateWishlistItemDto,
  ) {
    return this.wishlistService.update(id, user.id, updateWishlistItemDto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.wishlistService.remove(id, user.id);
  }
}
