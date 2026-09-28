import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from './auth.guards';
import { AuthService, toAccount, type AuthUser } from './auth.service';
import { RequestOtpDto, VerifyOtpDto } from './dto/otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('otp/request')
  @HttpCode(200)
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto);
  }

  @Post('otp/verify')
  @HttpCode(200)
  verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Headers('x-phonemail-client') client?: string,
  ) {
    return this.auth.verifyOtp(dto, client);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(
    @CurrentUser() user: AuthUser,
    @Headers('x-phonemail-client') client?: string,
  ) {
    if (client === 'mobile') await this.auth.markMobileApp(user.id);
    return { user, account: toAccount(user) };
  }
}
