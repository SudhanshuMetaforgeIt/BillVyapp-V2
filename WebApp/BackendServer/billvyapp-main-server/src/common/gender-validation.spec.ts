import { validate } from 'class-validator';
import { Gender } from './enums/gender.enum';
import { CreateCustomerDto } from '../customers/dto/create-customer.dto';
import { UpdateCustomerDto } from '../customers/dto/update-customer.dto';
import { CreateServiceDto } from '../services/dto/create-service.dto';
import { UpdateServiceDto } from '../services/dto/update-service.dto';
import { CreateServiceCategoryDto } from '../service-categories/dto/create-service-category.dto';
import { UpdateServiceCategoryDto } from '../service-categories/dto/update-service-category.dto';
import { BulkServiceItemDto } from '../services/dto/bulk-create-services.dto';
import { CreateBillDto } from '../bills/dto/create-bill.dto';
import { UpdateBillDto } from '../bills/dto/update-bill.dto';
const creates = [
  CreateCustomerDto,
  CreateServiceDto,
  CreateServiceCategoryDto,
  BulkServiceItemDto,
  CreateBillDto,
];
const updates = [
  UpdateCustomerDto,
  UpdateServiceDto,
  UpdateServiceCategoryDto,
  UpdateBillDto,
];
describe('Required gender contracts', () => {
  for (const Dto of creates) {
    const property = Dto === CreateBillDto ? 'serviceGender' : 'gender';
    it.each([undefined, null, '', 'INVALID', 'PREFER_NOT_TO_SAY'])(
      `${Dto.name} rejects missing or invalid ${property}: %s`,
      async (value) => {
        const errors = await validate(
          Object.assign(new Dto(), { [property]: value }),
        );
        expect(errors.some((error) => error.property === property)).toBe(true);
      },
    );
    it.each(Object.values(Gender))(`${Dto.name} accepts %s`, async (value) => {
      const errors = await validate(
        Object.assign(new Dto(), { [property]: value }),
      );
      expect(errors.some((error) => error.property === property)).toBe(false);
    });
  }
  for (const Dto of updates) {
    const property = Dto === UpdateBillDto ? 'serviceGender' : 'gender';
    it(`${Dto.name} retains omitted gender and rejects clearing it`, async () => {
      expect(
        (await validate(new Dto())).some(
          (error) => error.property === property,
        ),
      ).toBe(false);
      expect(
        (await validate(Object.assign(new Dto(), { [property]: null }))).some(
          (error) => error.property === property,
        ),
      ).toBe(true);
    });
  }
});
