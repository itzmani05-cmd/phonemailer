import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Named color slots; each app maps them to its theme (see shared/theme). */
export const LABEL_COLORS = [
  'green',
  'yellow',
  'red',
  'blue',
  'teal',
  'purple',
  'orange',
  'pink',
] as const;

export class CreateLabelDto {
  @MaxLength(40)
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsIn(LABEL_COLORS)
  color!: (typeof LABEL_COLORS)[number];
}
