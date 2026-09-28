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

  @Post('send')
  @HttpCode(200)
  send(@Body() dto: SendEmailDto, @CurrentUser() user?: AuthUser) {
    return this.emailService.send(dto, user);
  }

  @Get('status')
  status() {
    return this.emailService.status();
  }
}
