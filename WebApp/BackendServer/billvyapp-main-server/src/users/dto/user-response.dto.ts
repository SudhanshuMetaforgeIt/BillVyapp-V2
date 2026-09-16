import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserRoleSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ example: 'ADMIN' }) code: string;
}

export class UserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() roleId: string;
  @ApiProperty({ type: UserRoleSummaryDto }) role: UserRoleSummaryDto;
  @ApiPropertyOptional({ nullable: true }) franchiseId: string | null;
  @ApiPropertyOptional({ nullable: true }) salonId: string | null;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty() email: string;
  @ApiPropertyOptional({ nullable: true }) phone: string | null;
  @ApiPropertyOptional({ nullable: true }) profilePhoto: string | null;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional({ nullable: true }) lastLoginAt: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
