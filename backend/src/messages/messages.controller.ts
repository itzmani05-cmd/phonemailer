import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { MessagesService } from './messages.service';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /** Sent messages, newest first, with recipients and status. */
  @Get()
  list() {
    return this.messagesService.list();
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.messagesService.get(id);
  }
}
