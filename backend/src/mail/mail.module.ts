import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';
import { NewMailSmsService } from './new-mail-sms.service';

@Module({
  imports: [AuthModule],
  controllers: [MailController],
  providers: [MailService, NewMailSmsService],
  exports: [MailService],
})
export class MailModule {}
