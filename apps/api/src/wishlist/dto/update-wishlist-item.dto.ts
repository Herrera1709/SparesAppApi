import { PartialType } from '@nestjs/mapped-types';
import { CreateWishlistItemDto } from './create-wishlist-item.dto';

export class UpdateWishlistItemDto extends PartialType(CreateWishlistItemDto) {}

