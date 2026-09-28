import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiAuthGuard, CurrentUser } from '../auth/auth.guards';
import type { AuthUser } from '../auth/auth.service';
import { SendEmailDto } from './dto/send-email.dto';
import { EmailService } from './email.service';

@Controller('email')
@UseGuards(ApiAuthGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  /**
   * Sends through the configured SMTP relay; resolves once the relay accepts it.
   * Signed-in users send as their own <phone>@<domain> address.
   */
  @Post('send')
  @HttpCode(200)
  send(@Body() dto: SendEmailDto, @CurrentUser() user?: AuthUser) {
    return this.emailService.send(dto, user);
  }

  /** Live SMTP connection check (EHLO + auth). */
  @Get('status')
  status() {
    return this.emailService.status();
  }
}
