import type { Gender } from '@/lib/gender';
export type ServiceStats = {
  totalServices: number;
  activeServices: number;
  inactiveServices: number;
  averagePrice: number;
};

export type ServiceItem = {
  gender: Gender;
  productRecipe?: import("../components/product-recipe-editor").ProductRecipe[];
  id: string;
  name: string;
  categoryName: string;
  categoryId: string;
  branchName: string;
  salonId: string;
  price: number;
  durationMinutes: number;
  isActive: boolean;
  description?: string | null;
  createdAt: string;
};

export type ServiceCategoryItem = {
  gender: Gender;
  id: string;
  name: string;
  salonId: string;
  salonName?: string;
  description?: string | null;
  servicesCount?: number;
  isActive: boolean;
};

export type ServicesFilterState = {
  search: string;
  categoryId: string;
  branchId: string;
  status: 'all' | 'active' | 'inactive';
  page: number;
  limit: number;
};

export type CreateServicePayload = {
  gender: Gender;
  productRecipe?: import("../components/product-recipe-editor").ProductRecipe[];
  salonId: string;
  categoryId: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  taxRate?: number;
};
