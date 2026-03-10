export type MerchantCategoryType = 'REGIONAL' | 'NATIONAL' | 'GLOBAL';

export interface OnboardingItem {
  productId: string;
  quantity: number;
}

export interface MerchantCategoryConfig {
  id: string;
  merchantType: MerchantCategoryType;
  deliveryCommissionPct: number;
  productCommissionPct: number;
  registrationFeeUsd: number | null;
  onboardingProductId: string | null;
  onboardingQuantity: number | null;
  onboardingItems: OnboardingItem[];
}

export interface UpdateMerchantCategoryConfigBody {
  deliveryCommissionPct: number;
  productCommissionPct: number;
  registrationFeeUsd?: number | null;
  onboardingItems?: OnboardingItem[] | null;
  onboardingProductId?: string | null;
  onboardingQuantity?: number | null;
}
