import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
}

@Injectable()
export class NotificationsService {
  constructor(private supabase: SupabaseService) {}

  async registerToken(userId: string, token: string) {
    if (!token.startsWith('ExponentPushToken[')) {
      throw new BadRequestException('Token de Expo inválido');
    }

    // upsert: si el token ya existe para este usuario no duplica
    const { error } = await this.supabase.admin
      .from('push_tokens')
      .upsert(
        { user_id: userId, token },
        { onConflict: 'user_id,token', ignoreDuplicates: true },
      );

    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  async unregisterToken(userId: string, token: string) {
    await this.supabase.admin
      .from('push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', token);

    return { success: true };
  }

  // Notifica a todos los consumidores que tienen al restaurante en favoritos
  async notifyFavoritesOfNewOffer(
    restaurantId: string,
    restaurantName: string,
    offerTitle: string,
    emoji: string,
  ) {
    // Obtener consumer_ids que tienen este restaurante en favoritos
    const { data: favorites } = await this.supabase.admin
      .from('favorites')
      .select('consumer_id')
      .eq('restaurant_id', restaurantId);

    if (!favorites || favorites.length === 0) return;

    const userIds = favorites.map((f) => f.consumer_id);

    // Obtener sus tokens de push
    const { data: tokenRows } = await this.supabase.admin
      .from('push_tokens')
      .select('token')
      .in('user_id', userIds);

    if (!tokenRows || tokenRows.length === 0) return;

    const messages: ExpoMessage[] = tokenRows.map((row) => ({
      to: row.token,
      sound: 'default',
      title: `${emoji} ${restaurantName}`,
      body: offerTitle,
      data: { restaurantId, screen: 'RestaurantDetail' },
    }));

    await this.sendBatch(messages);
  }

  // Notifica al consumidor sobre el estado de su orden
  async notifyOrderStatus(
    consumerId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    const { data: tokenRows } = await this.supabase.admin
      .from('push_tokens')
      .select('token')
      .eq('user_id', consumerId);

    if (!tokenRows || tokenRows.length === 0) return;

    const messages: ExpoMessage[] = tokenRows.map((row) => ({
      to: row.token,
      sound: 'default',
      title,
      body,
      data,
    }));

    await this.sendBatch(messages);
  }

  // Expo acepta hasta 100 mensajes por lote
  private async sendBatch(messages: ExpoMessage[]) {
    const BATCH_SIZE = 100;
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      try {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(batch),
        });
      } catch {
        // Push failures no deben romper el flujo principal
      }
    }
  }
}
