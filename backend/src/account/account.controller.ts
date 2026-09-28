import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser, MailboxGuard } from '../auth/auth.guards';
import type { AuthUser } from '../auth/auth.service';
import { AccountService } from './account.service';
import { AliasDto, AvatarDto, UpdateAccountDto } from './dto/account.dto';

@Controller('account')
@UseGuards(MailboxGuard)
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.account.view(user.id);
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateAccountDto) {
    return this.account.rename(user.id, dto.name);
  }

  @Get('avatar')
  async avatar(@CurrentUser() user: AuthUser, @Res() res: Response) {
    const { contentType, content } = await this.account.avatar(user.id);
    res.type(contentType);
    res.setHeader('cache-control', 'private, max-age=31536000, immutable');
    res.send(content);
  }

  @Put('avatar')
  setAvatar(@CurrentUser() user: AuthUser, @Body() dto: AvatarDto) {
    return this.account.setAvatar(user.id, dto.contentType, dto.content);
  }

  @Delete('avatar')
  removeAvatar(@CurrentUser() user: AuthUser) {
    return this.account.removeAvatar(user.id);
  }

  @Post('aliases')
  addAlias(@CurrentUser() user: AuthUser, @Body() dto: AliasDto) {
    return this.account.addAlias(user.id, dto.name);
  }

  @Delete('aliases/:name')
  removeAlias(@CurrentUser() user: AuthUser, @Param('name') name: string) {
    return this.account.removeAlias(user.id, name);
  }
}
