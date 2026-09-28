import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser, MailboxGuard } from '../auth/auth.guards';
import type { AuthUser } from '../auth/auth.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateMailDto } from './dto/update-mail.dto';
import { MailService } from './mail.service';
import type { InboundMail } from './mail.types';

@Controller()
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('mail/inbound')
  @HttpCode(202)
  async inbound(
    @Headers('x-inbound-secret') secret: string | undefined,
    @Body() mail: InboundMail,
  ) {
    const expected = process.env.INBOUND_SECRET ?? '';
    if (expected && secret !== expected) {
      throw new UnauthorizedException();
    }
    const result = await this.mailService.receive(mail);
    if (!result.delivered.length) {
      throw new NotFoundException({
        message: 'No such mailbox',
        rejected: result.rejected,
      });
    }
    return { accepted: true, ...result };
  }

  @Get('mail')
  @UseGuards(MailboxGuard)
  list(@CurrentUser() user: AuthUser) {
    return this.mailService.list(user.id);
  }

  @Get('mail/:id')
  @UseGuards(MailboxGuard)
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.mailService.get(user.id, id);
  }

  @Patch('mail/:id')
  @UseGuards(MailboxGuard)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() changes: UpdateMailDto,
  ) {
    return this.mailService.update(user.id, id, changes);
  }

  @Delete('mail/:id')
  @UseGuards(MailboxGuard)
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.mailService.remove(user.id, id);
  }

  @Get('mail/:id/attachments/:index')
  @UseGuards(MailboxGuard)
  async attachment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('index', ParseIntPipe) index: number,
    @Res() res: Response,
  ) {
    const { meta, content } = await this.mailService.attachment(
      user.id,
      id,
      index,
    );
    res.attachment(meta.filename ?? `attachment-${index + 1}`);
    res.type(meta.contentType);
    res.send(content);
  }

  @Get('labels')
  @UseGuards(MailboxGuard)
  labels(@CurrentUser() user: AuthUser) {
    return this.mailService.listLabels(user.id);
  }

  @Post('labels')
  @UseGuards(MailboxGuard)
  createLabel(@CurrentUser() user: AuthUser, @Body() label: CreateLabelDto) {
    return this.mailService.createLabel(user.id, label);
  }
}
