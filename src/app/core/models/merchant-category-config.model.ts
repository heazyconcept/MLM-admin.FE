export type MerchantCategoryType = 'REGIONAL' | 'NATIONAL' | 'GLOBAL';

export interface OnboardingItem {
  productId: string;
  quantity: number;
  productName?: string;
}

export interface MerchantCategoryConfig {
  id: string;
  merchantType: MerchantCategoryType;
  deliveryCommissionPct: number;
  productCommissionPct: number;
  registrationFeeUsd: number | null;
  registrationFeeNGN: number | null;
  onboardingProductId: string | null;
  onboardingQuantity: number | null;
  onboardingItems: OnboardingItem[];
}

export interface UpdateMerchantCategoryConfigBody {
  deliveryCommissionPct: number;
  productCommissionPct: number;
  registrationFeeNGN?: number | null;
  onboardingItems?: OnboardingItem[] | null;
  onboardingProductId?: string | null;
  onboardingQuantity?: number | null;
}
