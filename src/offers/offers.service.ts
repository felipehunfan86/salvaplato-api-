import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';

@Injectable()
export class OffersService {
  constructor(private supabase: SupabaseService) {}

  // Listar ofertas activas — público
  async findAll(category?: string, restaurantId?: string) {
    let query = this.supabase.admin
      .from('offers')
      .select(`
        *,
        restaurants (id, name, address, cuisine_type, logo_url, latitude, longitude)
      `)
      .eq('status', 'active')
      .gt('pickup_deadline', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (category) query = query.eq('category', category);
    if (restaurantId) query = query.eq('restaurant_id', restaurantId);

    const { data, error } = await query;
    if (error) throw new NotFoundException(error.message);
    return data;
  }

  // Detalle de una oferta — público
  async findOne(id: string) {
    const { data, error } = await this.supabase.admin
      .from('offers')
      .select(`
        *,
        restaurants (id, name, address, cuisine_type, logo_url, cover_photo_url, latitude, longitude, schedule)
      `)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Oferta no encontrada');
    return data;
  }

  // Ofertas de mi restaurante — dueño autenticado
  async findMyOffers(userId: string) {
    const restaurant = await this.getRestaurantByOwner(userId);

    const { data, error } = await this.supabase.admin
      .from('offers')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false });

    if (error) throw new NotFoundException(error.message);
    return data;
  }

  // Crear oferta — dueño autenticado
  async create(userId: string, dto: CreateOfferDto) {
    await this.assertRestaurantOwner(userId, dto.restaurantId);

    const { data, error } = await this.supabase.admin
      .from('offers')
      .insert({
        restaurant_id: dto.restaurantId,
        title: dto.title,
        description: dto.description,
        original_price: dto.originalPrice,
        offer_price: dto.offerPrice,
        quantity_total: dto.quantityTotal,
        quantity_available: dto.quantityTotal,
        emoji: dto.emoji,
        category: dto.category,
        photo_url: dto.photoUrl,
        pickup_deadline: dto.pickupDeadline,
      })
      .select()
      .single();

    if (error) throw new NotFoundException(error.message);
    return data;
  }

  // Actualizar oferta — dueño autenticado
  async update(userId: string, id: string, dto: UpdateOfferDto) {
    const offer = await this.findOne(id);
    await this.assertRestaurantOwner(userId, offer.restaurant_id);

    const { data, error } = await this.supabase.admin
      .from('offers')
      .update({
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.originalPrice && { original_price: dto.originalPrice }),
        ...(dto.offerPrice && { offer_price: dto.offerPrice }),
        ...(dto.emoji !== undefined && { emoji: dto.emoji }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.photoUrl !== undefined && { photo_url: dto.photoUrl }),
        ...(dto.pickupDeadline && { pickup_deadline: dto.pickupDeadline }),
        ...(dto.status && { status: dto.status }),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new NotFoundException(error.message);
    return data;
  }

  // Eliminar / cerrar oferta — dueño autenticado
  async remove(userId: string, id: string) {
    const offer = await this.findOne(id);
    await this.assertRestaurantOwner(userId, offer.restaurant_id);

    const { error } = await this.supabase.admin
      .from('offers')
      .update({ status: 'closed' })
      .eq('id', id);

    if (error) throw new NotFoundException(error.message);
    return { message: 'Oferta cerrada' };
  }

  // --- helpers ---

  private async getRestaurantByOwner(userId: string) {
    const { data, error } = await this.supabase.admin
      .from('restaurants')
      .select('id')
      .eq('owner_id', userId)
      .single();

    if (error || !data) throw new NotFoundException('Restaurante no encontrado');
    return data;
  }

  private async assertRestaurantOwner(userId: string, restaurantId: string) {
    const { data } = await this.supabase.admin
      .from('restaurants')
      .select('id')
      .eq('id', restaurantId)
      .eq('owner_id', userId)
      .single();

    if (!data) throw new ForbiddenException('No tienes permiso sobre este restaurante');
  }
}
