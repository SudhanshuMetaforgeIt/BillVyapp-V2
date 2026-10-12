import { PickType } from '@nestjs/swagger';
import { CreateBillDto } from './create-bill.dto';

// Checking eligibility does not create a bill or consume an idempotency key.
export class MembershipOffersDto extends PickType(CreateBillDto, [
  'salonId',
  'customerId',
  'couponCode',
  'discount',
  'items',
] as const) {}
