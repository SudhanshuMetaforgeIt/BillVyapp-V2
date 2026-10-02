import { PartialType } from '@nestjs/swagger';
import { CreateSalonPhotoDto } from './create-salon-photo.dto';

export class UpdateSalonPhotoDto extends PartialType(CreateSalonPhotoDto) {}
