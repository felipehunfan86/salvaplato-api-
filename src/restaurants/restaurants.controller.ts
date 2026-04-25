import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private restaurantsService: RestaurantsService) {}

  // Público
  @Get()
  findAll(@Query('cuisineType') cuisineType?: string) {
    return this.restaurantsService.findAll(cuisineType);
  }

  // Público — restaurantes cercanos
  @Get('nearby')
  findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    return this.restaurantsService.findNearby(
      parseFloat(lat),
      parseFloat(lng),
      radius ? parseFloat(radius) : 5,
    );
  }

  // Dueño — mi restaurante
  @Get('mine')
  @UseGuards(AuthGuard)
  findMine(@CurrentUser() user: any) {
    return this.restaurantsService.findMine(user.id);
  }

  // Admin — pendientes de aprobación
  @Get('pending')
  @UseGuards(AuthGuard)
  findPending() {
    return this.restaurantsService.findPending();
  }

  // Público — detalle
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.restaurantsService.findOne(id);
  }

  // Dueño — registrar restaurante
  @Post()
  @UseGuards(AuthGuard)
  create(@CurrentUser() user: any, @Body() dto: CreateRestaurantDto) {
    return this.restaurantsService.create(user.id, dto);
  }

  // Dueño — actualizar
  @Patch('mine')
  @UseGuards(AuthGuard)
  update(@CurrentUser() user: any, @Body() dto: UpdateRestaurantDto) {
    return this.restaurantsService.update(user.id, dto);
  }

  // Admin — aprobar restaurante
  @Patch(':id/approve')
  @UseGuards(AuthGuard)
  approve(@Param('id') id: string) {
    return this.restaurantsService.approve(id);
  }
}
