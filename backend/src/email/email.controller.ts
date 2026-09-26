import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SendEmailDto } from './dto/send-email.dto';
import { EmailApiKeyGuard } from './email-api-key.guard';
import { EmailService } from './email.service';

@Controller('email')
@UseGuards(EmailApiKeyGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  /** Sends through the configured SMTP relay; resolves once the relay accepts it. */
  @Post('send')
  @HttpCode(200)
  send(@Body() dto: SendEmailDto) {
    return this.emailService.send(dto);
  }

  /** Live SMTP connection check (EHLO + auth). */
  @Get('status')
  status() {
    return this.emailService.status();
  }
}
