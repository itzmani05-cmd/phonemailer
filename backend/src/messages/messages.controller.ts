import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiAuthGuard, CurrentUser } from '../auth/auth.guards';
import type { AuthUser } from '../auth/auth.service';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(ApiAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  list(@CurrentUser() user?: AuthUser) {
    return this.messagesService.list(user?.id);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: AuthUser) {
    return this.messagesService.get(id, user?.id);
  }
}
