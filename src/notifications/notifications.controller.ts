import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RegisterTokenDto } from './dto/register-token.dto';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Post('tokens')
  register(@CurrentUser() user: any, @Body() dto: RegisterTokenDto) {
    return this.notificationsService.registerToken(user.id, dto.token);
  }

  @Delete('tokens/:token')
  unregister(@CurrentUser() user: any, @Param('token') token: string) {
    return this.notificationsService.unregisterToken(user.id, token);
  }
}
