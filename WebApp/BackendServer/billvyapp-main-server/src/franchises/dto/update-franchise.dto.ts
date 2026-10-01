import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsObject, IsOptional, ValidateNested } from 'class-validator';
import { CreateFranchiseDto } from './create-franchise.dto';
import { FranchisePreferencesDto } from './franchise-preferences.dto';

export class UpdateFranchiseDto extends PartialType(CreateFranchiseDto) {
  @ApiPropertyOptional({ type: FranchisePreferencesDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => FranchisePreferencesDto)
  preferences?: FranchisePreferencesDto;
}
