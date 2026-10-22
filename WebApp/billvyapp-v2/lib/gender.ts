export const GENDERS = ['MALE', 'FEMALE', 'OTHER', 'UNISEX'] as const;
export type Gender = typeof GENDERS[number];
export function genderLabel(gender: string) {
  return gender.charAt(0) + gender.slice(1).toLowerCase();
}
