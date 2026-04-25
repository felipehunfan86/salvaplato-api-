import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class FavoritesService {
  constructor(private supabase: SupabaseService) {}

  async findAll(userId: string) {
    const { data, error } = await this.supabase.admin
      .from('favorites')
      .select(`
        id,
        created_at,
        restaurants (
          id, name, address, logo_url, category, status,
          offers (id, title, emoji, offer_price, original_price, status, pickup_deadline)
        )
      `)
      .eq('consumer_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new NotFoundException(error.message);
    return data;
  }

  async add(userId: string, restaurantId: string) {
    const { data: restaurant } = await this.supabase.admin
      .from('restaurants')
      .select('id')
      .eq('id', restaurantId)
      .single();

    if (!restaurant) throw new NotFoundException('Restaurante no encontrado');

    const { data: existing } = await this.supabase.admin
      .from('favorites')
      .select('id')
      .eq('consumer_id', userId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (existing) throw new BadRequestException('Ya está en tus favoritos');

    const { data, error } = await this.supabase.admin
      .from('favorites')
      .insert({ consumer_id: userId, restaurant_id: restaurantId })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async remove(userId: string, restaurantId: string) {
    const { data, error } = await this.supabase.admin
      .from('favorites')
      .delete()
      .eq('consumer_id', userId)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Favorito no encontrado');
    return { success: true };
  }

  async check(userId: string, restaurantId: string) {
    const { data } = await this.supabase.admin
      .from('favorites')
      .select('id')
      .eq('consumer_id', userId)
      .eq('restaurant_id', restaurantId)
      .single();

    return { isFavorite: !!data };
  }
}
