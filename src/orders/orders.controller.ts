import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { RateOrderDto } from './dto/rate-order.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('orders')
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  // Consumidor — mis órdenes
  @Get('my')
  findMine(@CurrentUser() user: any) {
    return this.ordersService.findMyOrders(user.id);
  }

  // Restaurante — órdenes de mi local
  @Get('restaurant')
  findRestaurantOrders(@CurrentUser() user: any) {
    return this.ordersService.findRestaurantOrders(user.id);
  }

  // Detalle de orden
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ordersService.findOne(id, user.id);
  }

  // Consumidor — crear orden
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.id, dto);
  }

  // Restaurante — escanear QR (recibe el token del QR)
  @Post('scan/:qrToken')
  scanQr(@Param('qrToken') qrToken: string, @CurrentUser() user: any) {
    return this.ordersService.scanQr(qrToken, user.id);
  }

  // Consumidor — calificar orden
  @Patch(':id/rate')
  rate(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: RateOrderDto,
  ) {
    return this.ordersService.rate(id, user.id, dto);
  }
}
