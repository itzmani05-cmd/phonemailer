import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccountController } from './account/account.controller';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmailModule } from './email/email.module';
import { MailModule } from './mail/mail.module';
import { MessagesModule } from './messages/messages.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    // Real env vars (Docker, CI) win over values in backend/.env.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    MailModule,
    MessagesModule,
    EmailModule,
  ],
  controllers: [AppController, AccountController],
  providers: [AppService],
})
export class AppModule {}
