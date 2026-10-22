import { describe, it, expect } from 'vitest';
import { parseAndValidateServicesCsv } from './bulk-upload-dialog';
import { SERVICES_CSV_TEMPLATE } from './services-template-export';
describe('Service import gender', () => {
  it('rejects the old template without a required gender column', () => {
    expect(parseAndValidateServicesCsv('Service Name,Category,Price,Duration (Minutes),Description\nCut,Hair,500,30,Test')).toEqual({ ok: false, reason: 'template' });
  });
  it.each(['MALE', 'FEMALE', 'OTHER', 'UNISEX'])('imports %s classification', gender => {
    expect(parseAndValidateServicesCsv(`${SERVICES_CSV_TEMPLATE}Cut,Hair,500,30,${gender},Test`)).toMatchObject({ ok: true, services: [{ gender }] });
  });
  it.each(['', 'INVALID', 'PREFER_NOT_TO_SAY'])('rejects an empty or invalid gender %s', gender => {
    expect(parseAndValidateServicesCsv(`${SERVICES_CSV_TEMPLATE}Cut,Hair,500,30,${gender},Test`)).toEqual({ ok: false, reason: 'rows' });
  });
});
