export type ProductStatus = 'Draft' | 'Active' | 'Inactive' | 'Archived';
export type PurchaseEligibility = 'Cash' | 'Voucher' | 'Autoship';
export type Currency = 'USD' | 'NGN';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  shortDescription: string;
  fullDescription: string;
  price: number;
  currency: Currency;
  pv: number;
  cpv: number;
  images: string[];
  thumbnail: string;
  status: ProductStatus;
  visibility: boolean;
  purchaseEligibility: PurchaseEligibility[];
  packageRestrictions: string[];
  assignedMerchants: string[]; // Merchant IDs
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Merchant {
  id: string;
  name: string;
  isDefaultPickup: boolean;
}
