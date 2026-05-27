export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';
export type PackageCode = 'NICKEL' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'RUBY' | 'DIAMOND';
export type Currency = 'USD' | 'NGN';

export interface ProductPrice {
  id: string;
  productId: string;
  basePrice: number;
  nonMemberBasePrice?: number | null;
  pv: number;
  directReferralPv: number;
  cpv: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  createdAt: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  altText?: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string;
  sku: string;
  status: ProductStatus;
  visibleToAll: boolean;
  visibleToPackages: PackageCode[];
  merchantOnly: boolean;
  currentPrice: ProductPrice | null;
  createdAt: Date;
  updatedAt: Date;

  images?: ProductImage[];
  thumbnail?: string;
  assignedMerchants?: string[];
  createdBy?: string;
  adminPoolQuantity?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Merchant {
  id: string;
  name: string;
  isDefaultPickup: boolean;
}
