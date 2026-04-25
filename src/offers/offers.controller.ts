import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('offers')
export class OffersController {
  constructor(private offersService: OffersService) {}

  // Público
  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('restaurantId') restaurantId?: string,
  ) {
    return this.offersService.findAll(category, restaurantId);
  }

  // Dueño — mis ofertas
  @Get('my')
  @UseGuards(AuthGuard)
  findMine(@CurrentUser() user: any) {
    return this.offersService.findMyOffers(user.id);
  }

  // Público
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.offersService.findOne(id);
  }

  // Dueño — crear
  @Post()
  @UseGuards(AuthGuard)
  create(@CurrentUser() user: any, @Body() dto: CreateOfferDto) {
    return this.offersService.create(user.id, dto);
  }

  // Dueño — actualizar
  @Patch(':id')
  @UseGuards(AuthGuard)
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateOfferDto,
  ) {
    return this.offersService.update(user.id, id, dto);
  }

  // Dueño — cerrar
  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.offersService.remove(user.id, id);
  }
}
