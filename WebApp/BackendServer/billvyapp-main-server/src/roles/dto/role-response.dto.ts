import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoleResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ example: 'ADMIN' }) code: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty() isActive: boolean;
}
