import { PartialType } from '@nestjs/swagger';
import { CreateCustomerDto } from './create-customer.dto';

/**
 * id, userId, customerCode, passwordHash, roleId, createdAt and updatedAt
 * are never accepted. Status is changed via PATCH /customers/:id/status.
 */
export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
