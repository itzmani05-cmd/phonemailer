import {
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { MAIL_FOLDERS, type MailFolder } from '../mail.types';

export class UpdateMailDto {
  @IsBoolean()
  @IsOptional()
  read?: boolean;

  @IsBoolean()
  @IsOptional()
  starred?: boolean;

  @IsIn(MAIL_FOLDERS)
  @IsOptional()
  folder?: MailFolder;

  @IsString({ each: true })
  @IsArray()
  @IsOptional()
  labels?: string[];

  /** ISO timestamp to snooze until, or null to unsnooze. */
  @IsISO8601()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  snoozedUntil?: string | null;
}
