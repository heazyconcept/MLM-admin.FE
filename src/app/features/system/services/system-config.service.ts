import { Injectable, signal, computed } from '@angular/core';

export interface GeneralConfig {
  systemName: string;
  environment: 'Production' | 'Staging';
  maintenanceMode: boolean;
  supportContact: string;
  lastModified?: string;
  lastModifiedBy?: string;
}

export interface FinancialConfig {
  withdrawalCashPercent: number;
  withdrawalVoucherPercent: number;
  feePercent: number;
  earningsSummary: string;
  lastModified?: string;
  lastModifiedBy?: string;
}

export interface CurrencyConfig {
  baseCurrency: string;
  supportedCurrencies: string[];
  exchangeRates: Record<string, number>;
  locale: string;
  timezone: string;
  lastModified?: string;
  lastModifiedBy?: string;
}

export interface FeatureToggleItem {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface ThresholdsConfig {
  minWithdrawal: number;
  maxWithdrawal: number;
  dailyTransactionLimit: number;
  rankProgressionThreshold: number;
  lastModified?: string;
  lastModifiedBy?: string;
}

@Injectable({ providedIn: 'root' })
export class SystemConfigService {
  private readonly _general = signal<GeneralConfig>({
    systemName: 'Segulah MLM',
    environment: 'Production',
    maintenanceMode: false,
    supportContact: 'support@example.com',
    lastModified: '2025-01-15T10:00:00Z',
    lastModifiedBy: 'Admin',
  });

  private readonly _financial = signal<FinancialConfig>({
    withdrawalCashPercent: 70,
    withdrawalVoucherPercent: 30,
    feePercent: 2.5,
    earningsSummary: 'Earnings are distributed according to active bonus rules and ranking stages.',
    lastModified: '2025-01-10T14:00:00Z',
    lastModifiedBy: 'Admin',
  });

  private readonly _currency = signal<CurrencyConfig>({
    baseCurrency: 'USD',
    supportedCurrencies: ['USD', 'NGN', 'EUR', 'GBP'],
    exchangeRates: { USD: 1, NGN: 1650, EUR: 0.92, GBP: 0.79 },
    locale: 'en-US',
    timezone: 'UTC',
    lastModified: '2025-01-01T00:00:00Z',
    lastModifiedBy: 'System',
  });

  private readonly _features = signal<FeatureToggleItem[]>([
    { id: 'merchant', name: 'Merchant Center', description: 'Allow merchants to manage products and orders.', enabled: true },
    { id: 'autoship', name: 'Autoship Wallet', description: 'Recurring orders and wallet funding.', enabled: true },
    { id: 'cpv', name: 'CPV Milestones', description: 'CPV-based milestones and rewards.', enabled: true },
    { id: 'logistics', name: 'Logistics Module', description: 'Shipping and logistics configuration.', enabled: true },
  ]);

  private readonly _thresholds = signal<ThresholdsConfig>({
    minWithdrawal: 50,
    maxWithdrawal: 10000,
    dailyTransactionLimit: 50000,
    rankProgressionThreshold: 1000,
    lastModified: '2025-01-12T09:00:00Z',
    lastModifiedBy: 'Admin',
  });

  readonly general = this._general.asReadonly();
  readonly financial = this._financial.asReadonly();
  readonly currency = this._currency.asReadonly();
  readonly features = this._features.asReadonly();
  readonly thresholds = this._thresholds.asReadonly();

  setGeneral(config: Partial<GeneralConfig>): void {
    this._general.update((prev) => ({ ...prev, ...config }));
  }

  setFinancial(config: Partial<FinancialConfig>): void {
    this._financial.update((prev) => ({ ...prev, ...config }));
  }

  setCurrency(config: Partial<CurrencyConfig>): void {
    this._currency.update((prev) => ({ ...prev, ...config }));
  }

  setFeatureEnabled(id: string, enabled: boolean): void {
    this._features.update((list) =>
      list.map((f) => (f.id === id ? { ...f, enabled } : f))
    );
  }

  setFeatures(list: FeatureToggleItem[]): void {
    this._features.set([...list]);
  }

  setThresholds(config: Partial<ThresholdsConfig>): void {
    this._thresholds.update((prev) => ({ ...prev, ...config }));
  }
}
