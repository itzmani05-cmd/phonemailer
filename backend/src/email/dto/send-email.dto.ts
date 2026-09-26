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

// class-validator runs decorators bottom-up; with stopAtFirstError the lowest
// one reports first, so type checks sit at the bottom of each stack.

/** Accept `"a@x.com"` or `["a@x.com", "b@x.com"]`. */
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

  /** File bytes, base64-encoded. Total size is capped in EmailService. */
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

  /** Message-ID being replied to, so clients thread the reply. */
  @MaxLength(998)
  @IsString()
  @IsOptional()
  inReplyTo?: string;

  @MaxLength(998)
  @IsNotEmpty()
  @IsString()
  subject!: string;

  // At least one body is required; `text` is validated only when `html`/`body` are absent.
  @ValidateIf(
    (o: SendEmailDto) =>
      (o.html === undefined && o.body === undefined) || o.text !== undefined,
  )
  @IsNotEmpty({ message: 'body, text or html is required' })
  @IsString({ message: 'body, text or html is required' })
  text?: string;

  /** Plain-text body; alias for `text` (used when `text` is absent). */
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
