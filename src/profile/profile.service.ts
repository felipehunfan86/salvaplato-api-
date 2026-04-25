import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private supabase: SupabaseService) {}

  async getProfile(userId: string) {
    const { data, error } = await this.supabase.admin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) throw new NotFoundException('Perfil no encontrado');
    return data;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updates: Record<string, string> = {};
    if (dto.fullName !== undefined) updates.full_name = dto.fullName;
    if (dto.phone !== undefined) updates.phone = dto.phone;
    if (dto.zone !== undefined) updates.zone = dto.zone;
    if (dto.photoUrl !== undefined) updates.photo_url = dto.photoUrl;

    const { data, error } = await this.supabase.admin
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new NotFoundException(error.message);
    return data;
  }
}
