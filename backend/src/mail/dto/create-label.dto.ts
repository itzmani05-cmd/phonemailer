import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

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
