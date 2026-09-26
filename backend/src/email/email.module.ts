import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from '../mail/mail.module';
import { MessagesModule } from '../messages/messages.module';
import { EmailApiKeyGuard } from './email-api-key.guard';
import { emailConfig } from './email.config';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';

@Module({
  imports: [ConfigModule.forFeature(emailConfig), MailModule, MessagesModule],
  controllers: [EmailController],
  providers: [EmailService, EmailApiKeyGuard],
  exports: [EmailService],
})
export class EmailModule {}
