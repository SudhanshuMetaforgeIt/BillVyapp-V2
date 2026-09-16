import { IsIndianMobileNumber } from '../../common/validators/indian-phone.decorator';

export class SendOtpDto {
  @IsIndianMobileNumber()
  phone: string;
}
