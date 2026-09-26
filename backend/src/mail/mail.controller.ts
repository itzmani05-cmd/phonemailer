import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateMailDto } from './dto/update-mail.dto';
import { MailService } from './mail.service';
import type { InboundMail } from './mail.types';

@Controller()
export class MailController {
  constructor(private readonly mailService: MailService) {}

  /** Called by the mail-server service for every received message. */
  @Post('mail/inbound')
  @HttpCode(202)
  inbound(
    @Headers('x-inbound-secret') secret: string | undefined,
    @Body() mail: InboundMail,
  ) {
    const expected = process.env.INBOUND_SECRET ?? '';
    if (expected && secret !== expected) {
      throw new UnauthorizedException();
    }
    const stored = this.mailService.store(mail);
    return { accepted: true, id: stored.id };
  }

  @Get('mail')
  list() {
    return this.mailService.list();
  }

  @Get('mail/:id')
  get(@Param('id') id: string) {
    return this.mailService.get(id);
  }

  @Patch('mail/:id')
  update(@Param('id') id: string, @Body() changes: UpdateMailDto) {
    return this.mailService.update(id, changes);
  }

  /** Permanent delete (the apps move mail to Trash first via PATCH). */
  @Delete('mail/:id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    this.mailService.remove(id);
  }

  @Get('mail/:id/attachments/:index')
  attachment(
    @Param('id') id: string,
    @Param('index', ParseIntPipe) index: number,
    @Res() res: Response,
  ) {
    const { meta, content } = this.mailService.attachment(id, index);
    res.attachment(meta.filename ?? `attachment-${index + 1}`);
    res.type(meta.contentType);
    res.send(content);
  }

  @Get('labels')
  labels() {
    return this.mailService.listLabels();
  }

  @Post('labels')
  createLabel(@Body() label: CreateLabelDto) {
    return this.mailService.createLabel(label);
  }
}
