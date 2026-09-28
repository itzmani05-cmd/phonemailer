import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBase64,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const MAX_RECIPIENTS = 50;
const MAX_ATTACHMENTS = 10;

const toArray = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? [value] : value;

export class AttachmentDto {
  @MaxLength(255)
  @IsNotEmpty()
  @IsString()
  filename!: string;

  @MaxLength(255)
  @IsString()
  @IsOptional()
  contentType?: string;

  @IsBase64()
  @IsString()
  content!: string;
}

export class SendEmailDto {
  @IsEmail({}, { each: true })
  @ArrayMaxSize(MAX_RECIPIENTS)
  @ArrayNotEmpty()
  @IsArray()
  @Transform(toArray)
  to!: string[];

  @IsEmail({}, { each: true })
  @ArrayMaxSize(MAX_RECIPIENTS)
  @IsArray()
  @Transform(toArray)
  @IsOptional()
  cc?: string[];

  @IsEmail({}, { each: true })
  @ArrayMaxSize(MAX_RECIPIENTS)
  @IsArray()
  @Transform(toArray)
  @IsOptional()
  bcc?: string[];

  @IsEmail()
  @IsOptional()
  replyTo?: string;

  @MaxLength(998)
  @IsString()
  @IsOptional()
  inReplyTo?: string;

  @MaxLength(998)
  @IsNotEmpty()
  @IsString()
  subject!: string;

  @ValidateIf(
    (o: SendEmailDto) =>
      (o.html === undefined && o.body === undefined) || o.text !== undefined,
  )
  @IsNotEmpty({ message: 'body, text or html is required' })
  @IsString({ message: 'body, text or html is required' })
  text?: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  body?: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  html?: string;

  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  @ArrayMaxSize(MAX_ATTACHMENTS)
  @IsArray()
  @IsOptional()
  attachments?: AttachmentDto[];
}
