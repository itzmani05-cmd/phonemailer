import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class RequestOtpDto {
  /** National or international form; the server normalizes it to E.164. */
  @MaxLength(20)
  @IsString()
  phone!: string;

  /** e.g. "+91" (the default). */
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
