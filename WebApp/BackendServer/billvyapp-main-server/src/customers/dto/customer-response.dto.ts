import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '../../common/enums/gender.enum';

export class CustomerResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty({ example: 'CUST-A1B2C3D4' }) customerCode: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty() email: string;
  @ApiProperty() phone: string;
  @ApiPropertyOptional({ nullable: true }) profilePhoto: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date' })
  dateOfBirth: Date | null;
  @ApiPropertyOptional({ enum: Gender, nullable: true }) gender: Gender | null;
  @ApiProperty({
    description: 'Taken from the related User.isActive field',
  })
  isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
