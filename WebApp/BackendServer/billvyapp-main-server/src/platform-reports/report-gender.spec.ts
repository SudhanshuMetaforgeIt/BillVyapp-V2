import { mostFrequentGenderService, mostVisitedCustomers } from './report-gender';

describe('Most frequent service by service gender', () => {
  it('returns every customer tied for most visits within each customer gender', () => {
    const rows = [
      { id: 'a', name: 'Male A', phone: '+919876543210', gender: 'MALE', bills: 5 },
      { id: 'b', name: 'Male B', phone: '+919876543211', gender: 'MALE', bills: 5 },
      { id: 'c', name: 'Male C', gender: 'MALE', bills: 2 },
      { id: 'd', name: 'Female A', phone: '+919876543212', gender: 'FEMALE', bills: 3 },
    ];
    expect(mostVisitedCustomers(rows).map(row => row.id)).toEqual(['a', 'b', 'd']);
    expect(mostVisitedCustomers([])).toEqual([]);
  });
  const services = [
    { gender: 'MALE', name: 'Beard Trim', quantity: 10, revenue: 100 },
    { gender: 'MALE', name: 'Hair Colour', quantity: 2, revenue: 5000 },
    { gender: 'FEMALE', name: 'Facial', quantity: 7 },
    { gender: 'OTHER', name: 'Haircut', quantity: 3 },
    { gender: 'UNISEX', name: 'Massage', quantity: 4 },
  ];
  it.each([['MALE', 'Beard Trim', 10], ['FEMALE', 'Facial', 7], ['OTHER', 'Haircut', 3], ['UNISEX', 'Massage', 4]])('ranks %s by units rather than revenue', (gender, name, quantity) => {
    expect(mostFrequentGenderService(services, String(gender))).toEqual({ name, quantity });
  });
  it('lists all ties in a stable order', () => {
    expect(mostFrequentGenderService([...services, { gender: 'MALE', name: 'Haircut', quantity: 10 }], 'MALE')).toEqual({ name: 'Beard Trim; Haircut', quantity: 10 });
  });
  it('does not invent a winner without sales or a saved gender', () => {
    expect(mostFrequentGenderService([], 'MALE')).toEqual({ name: 'No service sales', quantity: 0 });
    expect(mostFrequentGenderService([{ name: 'Legacy service', quantity: 2 }], 'UNSPECIFIED')).toEqual({ name: 'Legacy service', quantity: 2 });
  });
});
