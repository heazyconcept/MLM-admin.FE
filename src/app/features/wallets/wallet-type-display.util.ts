/** Display metadata for admin wallet management (list + types summary). */
export interface WalletTypeDisplayConfig {
  type: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  colorClass: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export const WALLET_TYPE_DISPLAY_CONFIG: WalletTypeDisplayConfig[] = [
  {
    type: 'REGISTRATION',
    label: 'Registration wallet',
    shortLabel: 'Registration',
    description:
      'Dedicated funds used exclusively for new user package registrations and sponsor activations.',
    icon: 'pi pi-user-plus',
    colorClass: 'blue',
    bgClass: 'bg-blue-50/60 border-blue-100',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
  },
  {
    type: 'CASH',
    label: 'Cash wallet',
    shortLabel: 'Cash',
    description:
      'Commission earnings, bonuses, and funds available for bank withdrawal (cashout).',
    icon: 'pi pi-money-bill',
    colorClass: 'emerald',
    bgClass: 'bg-emerald-50/60 border-emerald-100',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
  },
  {
    type: 'VOUCHER',
    label: 'Product voucher wallet',
    shortLabel: 'Voucher',
    description: 'Network product voucher balance for marketplace purchases.',
    icon: 'pi pi-ticket',
    colorClass: 'amber',
    bgClass: 'bg-amber-50/60 border-amber-100',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
  },
  {
    type: 'AUTOSHIP',
    label: 'Autoship wallet',
    shortLabel: 'Autoship',
    description: 'Autoship funds for monthly product cycles and maintenance purchases.',
    icon: 'pi pi-refresh',
    colorClass: 'purple',
    bgClass: 'bg-purple-50/60 border-purple-100',
    textClass: 'text-purple-700',
    borderClass: 'border-purple-200',
  },
  {
    type: 'LEGACY_CASHOUT',
    label: 'Legacy cashout wallet',
    shortLabel: 'Legacy cashout',
    description: 'Legacy Club earnings and cashout balance for Legacy members.',
    icon: 'pi pi-wallet',
    colorClass: 'teal',
    bgClass: 'bg-teal-50/60 border-teal-100',
    textClass: 'text-teal-700',
    borderClass: 'border-teal-200',
  },
  {
    type: 'LEGACY_VOUCHER',
    label: 'Legacy product voucher',
    shortLabel: 'Legacy voucher',
    description: 'Legacy Club marketplace product voucher balance.',
    icon: 'pi pi-gift',
    colorClass: 'rose',
    bgClass: 'bg-rose-50/60 border-rose-100',
    textClass: 'text-rose-700',
    borderClass: 'border-rose-200',
  },
];

const LABEL_BY_TYPE = new Map(
  WALLET_TYPE_DISPLAY_CONFIG.map((c) => [c.type.toUpperCase(), c.label]),
);

export function normalizeWalletTypeKey(walletType: string | undefined | null): string {
  return (walletType ?? '').toUpperCase().replace(/-/g, '_');
}

export function walletTypeLabel(walletType: string | undefined | null): string {
  const key = normalizeWalletTypeKey(walletType);
  if (!key) return 'Wallet';
  return LABEL_BY_TYPE.get(key) ?? key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function assignWalletToGroup(
  group: {
    registrationWallet: unknown;
    cashWallet: unknown;
    voucherWallet: unknown;
    autoshipWallet: unknown;
    legacyCashoutWallet: unknown;
    legacyVoucherWallet: unknown;
  },
  wallet: unknown,
  walletType: string | undefined | null,
): void {
  const key = normalizeWalletTypeKey(walletType);
  switch (key) {
    case 'REGISTRATION':
      group.registrationWallet = wallet;
      break;
    case 'CASH':
      group.cashWallet = wallet;
      break;
    case 'VOUCHER':
      group.voucherWallet = wallet;
      break;
    case 'AUTOSHIP':
      group.autoshipWallet = wallet;
      break;
    case 'LEGACY_CASHOUT':
      group.legacyCashoutWallet = wallet;
      break;
    case 'LEGACY_VOUCHER':
      group.legacyVoucherWallet = wallet;
      break;
    default:
      break;
  }
}
