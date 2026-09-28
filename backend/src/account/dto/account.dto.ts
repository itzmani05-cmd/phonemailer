import { IsBase64, IsIn, IsString, Matches, MaxLength } from 'class-validator';

export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export class UpdateAccountDto {
  @MaxLength(50)
  @IsString()
  name!: string;
}

export class AvatarDto {
  @IsIn(AVATAR_TYPES)
  contentType!: (typeof AVATAR_TYPES)[number];

  @IsBase64()
  @IsString()
  content!: string;
}

export class AliasDto {
  @Matches(/^[a-z][a-z0-9._-]{2,29}$/i, {
    message:
      'Alias IDs are 3 to 30 letters, numbers, dots, dashes or underscores, starting with a letter',
  })
  @IsString()
  name!: string;
}
