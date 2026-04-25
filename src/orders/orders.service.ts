import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { RateOrderDto } from './dto/rate-order.dto';

@Injectable()
export class OrdersService {
  private readonly commissionRate: number;

  constructor(
    private supabase: SupabaseService,
    private config: ConfigService,
    private notifications: NotificationsService,
  ) {
    this.commissionRate = parseFloat(config.get('COMMISSION_RATE', '0.15'));
  }

  // Mis órdenes — consumidor
  async findMyOrders(userId: string) {
    const { data, error } = await this.supabase.admin
      .from('orders')
      .select(`
        *,
        offers (id, title, emoji, category, photo_url, pickup_deadline),
        restaurants (id, name, address, logo_url)
      `)
      .eq('consumer_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new NotFoundException(error.message);
    return data;
  }

  // Órdenes de mi restaurante — dueño
  async findRestaurantOrders(userId: string) {
    const { data: restaurant } = await this.supabase.admin
      .from('restaurants')
      .select('id')
      .eq('owner_id', userId)
      .single();

    if (!restaurant) throw new NotFoundException('Restaurante no encontrado');

    const { data, error } = await this.supabase.admin
      .from('orders')
      .select(`
        *,
        offers (id, title, emoji, category),
        profiles!orders_consumer_id_fkey (full_name, phone)
      `)
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false });

    if (error) throw new NotFoundException(error.message);
    return data;
  }

  // Detalle de orden
  async findOne(id: string, userId: string) {
    const { data, error } = await this.supabase.admin
      .from('orders')
      .select(`
        *,
        offers (id, title, emoji, photo_url, pickup_deadline),
        restaurants (id, name, address, phone, logo_url)
      `)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Orden no encontrada');

    // Solo el consumidor o el dueño del restaurante pueden verla
    const isConsumer = data.consumer_id === userId;
    const { data: restaurant } = await this.supabase.admin
      .from('restaurants')
      .select('owner_id')
      .eq('id', data.restaurant_id)
      .single();

    const isOwner = restaurant?.owner_id === userId;
    if (!isConsumer && !isOwner) throw new ForbiddenException();

    return data;
  }

  // Crear orden — consumidor
  async create(userId: string, dto: CreateOrderDto) {
    // 1. Obtener oferta con datos del restaurante
    const { data: offer, error: offerError } = await this.supabase.admin
      .from('offers')
      .select('*, restaurants(id, owner_id, status)')
      .eq('id', dto.offerId)
      .single();

    if (offerError || !offer) throw new NotFoundException('Oferta no encontrada');

    // 2. Validaciones
    if (offer.status !== 'active')
      throw new BadRequestException('Esta oferta ya no está disponible');

    if (new Date(offer.pickup_deadline) < new Date())
      throw new BadRequestException('El tiempo de retiro ha expirado');

    if (offer.quantity_available < dto.quantity)
      throw new BadRequestException('No hay suficiente stock disponible');

    if (offer.restaurants.owner_id === userId)
      throw new BadRequestException('No puedes comprar tus propias ofertas');

    // 3. Calcular montos
    const subtotal = offer.offer_price * dto.quantity;
    const commissionAmount = parseFloat((subtotal * this.commissionRate).toFixed(2));
    const restaurantPayout = parseFloat((subtotal - commissionAmount).toFixed(2));

    // 4. Generar order_code único
    const orderCode = await this.generateOrderCode();

    // 5. Crear la orden (trigger descuenta stock automáticamente)
    const { data: order, error } = await this.supabase.admin
      .from('orders')
      .insert({
        order_code: orderCode,
        consumer_id: userId,
        offer_id: dto.offerId,
        restaurant_id: offer.restaurant_id,
        quantity: dto.quantity,
        unit_price: offer.offer_price,
        subtotal,
        commission_rate: this.commissionRate,
        commission_amount: commissionAmount,
        restaurant_payout: restaurantPayout,
        pickup_deadline: offer.pickup_deadline,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return order;
  }

  // Escanear QR — restaurante confirma retiro
  async scanQr(qrToken: string, userId: string) {
    const { data: order, error } = await this.supabase.admin
      .from('orders')
      .select('*, restaurants(owner_id)')
      .eq('qr_token', qrToken)
      .single();

    if (error || !order) throw new NotFoundException('QR inválido');

    // Verificar que el escáner es el dueño del restaurante
    if (order.restaurants.owner_id !== userId)
      throw new ForbiddenException('No tienes permiso para escanear este QR');

    if (order.status !== 'pending')
      throw new BadRequestException(`La orden ya está en estado: ${order.status}`);

    if (new Date(order.pickup_deadline) < new Date())
      throw new BadRequestException('El tiempo de retiro ha expirado');

    // Marcar como completada
    const { data: updated, error: updateError } = await this.supabase.admin
      .from('orders')
      .update({
        status: 'completed',
        scanned_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .select()
      .single();

    if (updateError) throw new BadRequestException(updateError.message);

    // Notificar al consumidor que su pedido fue confirmado
    this.notifications
      .notifyOrderStatus(
        order.consumer_id,
        '✅ Pedido confirmado',
        `Tu pedido #${order.order_code} fue escaneado. ¡Disfrútalo!`,
        { orderId: order.id, screen: 'OrderDetail' },
      )
      .catch(() => {}); // fire-and-forget

    // TODO: disparar Stripe transfer (restaurant_payout al stripe_account_id)

    return updated;
  }

  // Calificar orden — consumidor
  async rate(id: string, userId: string, dto: RateOrderDto) {
    const { data: order } = await this.supabase.admin
      .from('orders')
      .select('consumer_id, status, rating')
      .eq('id', id)
      .single();

    if (!order) throw new NotFoundException('Orden no encontrada');
    if (order.consumer_id !== userId) throw new ForbiddenException();
    if (order.status !== 'completed')
      throw new BadRequestException('Solo puedes calificar órdenes completadas');
    if (order.rating)
      throw new BadRequestException('Esta orden ya fue calificada');

    const { data, error } = await this.supabase.admin
      .from('orders')
      .update({ rating: dto.rating, rated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // Generar order_code único tipo SP-XXXXX
  private async generateOrderCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let attempts = 0;

    while (attempts < 10) {
      let code = 'SP-';
      for (let i = 0; i < 5; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }

      const { data } = await this.supabase.admin
        .from('orders')
        .select('id')
        .eq('order_code', code)
        .single();

      if (!data) return code;
      attempts++;
    }

    throw new BadRequestException('No se pudo generar un código único');
  }
}
