import { IsString, Matches, MaxLength } from 'class-validator';

export class SignedObjectQueryDto {
  @IsString() @MaxLength(512) key: string;
  @IsString() @Matches(/^\d{13}$/) exp: string;
  @IsString() @Matches(/^[a-f0-9]{64}$/) sig: string;
}
