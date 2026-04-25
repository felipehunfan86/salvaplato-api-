import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private supabase: SupabaseService) {}

  async register(dto: RegisterDto) {
    const { data, error } = await this.supabase.client.auth.signUp({
      email: dto.email,
      password: dto.password,
      options: {
        data: { full_name: dto.fullName, phone: dto.phone },
      },
    });

    if (error) throw new ConflictException(error.message);

    // El trigger crea el profile. Actualizamos zone si viene.
    if (data.user && dto.zone) {
      await this.supabase.admin
        .from('profiles')
        .update({ zone: dto.zone })
        .eq('id', data.user.id);
    }

    return { user: data.user, session: data.session };
  }

  async login(dto: LoginDto) {
    const { data, error } =
      await this.supabase.client.auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

    if (error) throw new UnauthorizedException('Credenciales inválidas');

    return { user: data.user, session: data.session };
  }

  async getProfile(userId: string) {
    const { data, error } = await this.supabase.admin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw new UnauthorizedException();
    return data;
  }
}
