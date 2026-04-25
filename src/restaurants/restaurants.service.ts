import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(private supabase: SupabaseService) {}

  // Listar restaurantes aprobados — público
  async findAll(cuisineType?: string) {
    let query = this.supabase.admin
      .from('restaurants')
      .select('id, name, address, cuisine_type, logo_url, cover_photo_url, latitude, longitude, schedule, description, instagram')
      .eq('status', 'approved')
      .order('name');

    if (cuisineType) query = query.eq('cuisine_type', cuisineType);

    const { data, error } = await query;
    if (error) throw new NotFoundException(error.message);
    return data;
  }

  // Detalle de restaurante — público
  async findOne(id: string) {
    const { data, error } = await this.supabase.admin
      .from('restaurants')
      .select(`
        *,
        offers (id, title, offer_price, original_price, emoji, category, pickup_deadline, quantity_available, status)
      `)
      .eq('id', id)
      .eq('status', 'approved')
      .single();

    if (error || !data) throw new NotFoundException('Restaurante no encontrado');
    return data;
  }

  // Mi restaurante — dueño autenticado
  async findMine(userId: string) {
    const { data, error } = await this.supabase.admin
      .from('restaurants')
      .select('*')
      .eq('owner_id', userId)
      .single();

    if (error || !data) throw new NotFoundException('No tienes un restaurante registrado');
    return data;
  }

  // Registrar restaurante — dueño autenticado
  async create(userId: string, dto: CreateRestaurantDto) {
    // Un usuario solo puede tener un restaurante
    const { data: existing } = await this.supabase.admin
      .from('restaurants')
      .select('id')
      .eq('owner_id', userId)
      .single();

    if (existing) throw new ConflictException('Ya tienes un restaurante registrado');

    const { data, error } = await this.supabase.admin
      .from('restaurants')
      .insert({
        owner_id: userId,
        name: dto.name,
        rif: dto.rif,
        owner_name: dto.ownerName,
        phone: dto.phone,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        cuisine_type: dto.cuisineType,
        schedule: dto.schedule,
        logo_url: dto.logoUrl,
        cover_photo_url: dto.coverPhotoUrl,
        description: dto.description,
        instagram: dto.instagram,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new ConflictException(error.message);
    return data;
  }

  // Actualizar restaurante — dueño autenticado
  async update(userId: string, dto: UpdateRestaurantDto) {
    const restaurant = await this.findMine(userId);

    const { data, error } = await this.supabase.admin
      .from('restaurants')
      .update({
        ...(dto.name && { name: dto.name }),
        ...(dto.phone && { phone: dto.phone }),
        ...(dto.address && { address: dto.address }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.cuisineType && { cuisine_type: dto.cuisineType }),
        ...(dto.schedule !== undefined && { schedule: dto.schedule }),
        ...(dto.logoUrl !== undefined && { logo_url: dto.logoUrl }),
        ...(dto.coverPhotoUrl !== undefined && { cover_photo_url: dto.coverPhotoUrl }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.instagram !== undefined && { instagram: dto.instagram }),
      })
      .eq('id', restaurant.id)
      .select()
      .single();

    if (error) throw new NotFoundException(error.message);
    return data;
  }

  // Aprobar restaurante — solo admin (service_role)
  async approve(id: string) {
    const { data, error } = await this.supabase.admin
      .from('restaurants')
      .update({ status: 'approved' })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Restaurante no encontrado');
    return data;
  }

  // Restaurantes pendientes de aprobación — solo admin
  async findPending() {
    const { data, error } = await this.supabase.admin
      .from('restaurants')
      .select('*')
      .eq('status', 'pending')
      .order('created_at');

    if (error) throw new NotFoundException(error.message);
    return data;
  }

  // Restaurantes cercanos por coordenadas
  async findNearby(lat: number, lng: number, radiusKm = 5) {
    // Haversine aproximado en SQL via Supabase RPC — por ahora filtramos por bounding box
    const delta = radiusKm / 111;

    const { data, error } = await this.supabase.admin
      .from('restaurants')
      .select('id, name, address, cuisine_type, logo_url, latitude, longitude')
      .eq('status', 'approved')
      .gte('latitude', lat - delta)
      .lte('latitude', lat + delta)
      .gte('longitude', lng - delta)
      .lte('longitude', lng + delta);

    if (error) throw new NotFoundException(error.message);
    return data;
  }

  private async assertOwner(userId: string, restaurantId: string) {
    const { data } = await this.supabase.admin
      .from('restaurants')
      .select('id')
      .eq('id', restaurantId)
      .eq('owner_id', userId)
      .single();

    if (!data) throw new ForbiddenException('No tienes permiso sobre este restaurante');
  }
}
