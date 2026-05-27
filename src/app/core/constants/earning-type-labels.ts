/**
 * Human-readable labels for backend `earningType` / `LedgerEarningType` enum values.
 *
 * Covers both member-stream types (PPPC, DRPPC, CPPC …) and the new
 * merchant-stream types added for dual-earning product purchases.
 */
export const EARNING_TYPE_LABELS: Record<string, string> = {
  // ── Member stream (cash commissions) ──
  PERSONAL_PRODUCT_PURCHASE: 'Personal product purchase commission',
  DIRECT_REFERRAL_PRODUCT_PURCHASE: 'Direct referral product purchase commission',
  COMMUNITY_PRODUCT_PURCHASE: 'Community product purchase commission',
  LEVEL_COMMISSION: 'Level commission',

  // ── Merchant stream (product purchase – dual earning) ──
  MERCHANT_PERSONAL_PRODUCT: 'Merchant product purchase commission',
  MERCHANT_DIRECT_REFERRAL_PRODUCT: 'Merchant direct referral product commission',
  MERCHANT_COMMUNITY_PRODUCT: 'Merchant community product commission',
  MERCHANT_DELIVERY_BONUS: 'Merchant delivery commission',

  // ── PV / CPV sources (volume distribution) ──
  PRODUCT_PURCHASE_PV: 'Personal product PV',
  DIRECT_REFERRAL_PRODUCT_PV: 'Direct referral product PV',
  COMMUNITY_PRODUCT_MATRIX: 'Community product CPV',
  DIRECT_REFERRAL_REGISTRATION: 'Direct referral registration PV',
  COMMUNITY_REGISTRATION_MATRIX: 'Community registration CPV',
};

/**
 * Returns a human-readable label for the given earning type.
 * Falls back to title-casing the raw key if no mapping exists.
 */
export function getEarningTypeLabel(type: string): string {
  if (!type) return '—';
  const label = EARNING_TYPE_LABELS[type];
  if (label) return label;

  // Fallback: convert SCREAMING_SNAKE to Title Case
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
