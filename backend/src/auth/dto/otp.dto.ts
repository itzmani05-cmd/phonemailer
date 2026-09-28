import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class RequestOtpDto {
  @MaxLength(20)
  @IsString()
  phone!: string;

  @Matches(/^\+?\d{1,4}$/)
  @IsString()
  @IsOptional()
  countryCode?: string;
}

export class VerifyOtpDto extends RequestOtpDto {
  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' })
  @IsString()
  code!: string;
}
