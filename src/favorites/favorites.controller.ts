import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('favorites')
@UseGuards(AuthGuard)
export class FavoritesController {
  constructor(private favoritesService: FavoritesService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.favoritesService.findAll(user.id);
  }

  @Get(':restaurantId/check')
  check(
    @Param('restaurantId') restaurantId: string,
    @CurrentUser() user: any,
  ) {
    return this.favoritesService.check(user.id, restaurantId);
  }

  @Post(':restaurantId')
  add(
    @Param('restaurantId') restaurantId: string,
    @CurrentUser() user: any,
  ) {
    return this.favoritesService.add(user.id, restaurantId);
  }

  @Delete(':restaurantId')
  remove(
    @Param('restaurantId') restaurantId: string,
    @CurrentUser() user: any,
  ) {
    return this.favoritesService.remove(user.id, restaurantId);
  }
}
