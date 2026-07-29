import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  MerchantPackageLedgerEntry,
  MerchantPackageUpgradeDetail,
  MerchantPackageUpgradeService,
} from '../services/merchant-package-upgrade.service';

@Component({
  selector: 'app-merchant-package-upgrade-detail',
  imports: [CommonModule, RouterModule],
  templateUrl: './merchant-package-upgrade-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MerchantPackageUpgradeDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private upgradeService = inject(MerchantPackageUpgradeService);

  detail = signal<MerchantPackageUpgradeDetail | null>(null);
  loading = signal(false);
  loadError = signal<string | null>(null);

  ledgerEntries = computed<MerchantPackageLedgerEntry[]>(() => this.detail()?.ledgerEntries ?? []);
  funding = computed(() => this.detail()?.funding ?? null);

  links = computed(() => {
    const d = this.detail();
    if (!d) return null;
    return (
      d.links ?? {
        merchantId: d.merchantId,
        userId: d.userId,
        paymentId: d.paymentId ?? null,
      }
    );
  });

  emptyLedgerMessage = computed(() => {
    const mode = this.funding()?.mode;
    const effect = this.funding()?.netWalletEffect;
    if (mode === 'ADMIN_WAIVE') {
      return 'Payment waived — no wallet ledger entries';
    }
    if (mode === 'GATEWAY_PAYMENT' || effect === 'NONE') {
      return 'No wallet movement for this merchant package event';
    }
    return 'No wallet ledger entries recorded for this event';
  });

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const id = params['id'];
      if (id) {
        this.loadDetail(id);
      }
    });
  }

  private loadDetail(id: string): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.upgradeService.getById(id).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.loadError.set(
          err?.error?.message ?? err?.message ?? 'Failed to load merchant package upgrade details'
        );
        this.detail.set(null);
      },
    });
  }

  formatType = (type?: string | null) => this.upgradeService.formatTypeLabel(type);
  getTypeColor = (type?: string | null) => this.upgradeService.getTypeColor(type);
  formatEventType = (eventType?: string | null) =>
    this.upgradeService.formatEventTypeLabel(eventType);
  formatSource = (source?: string | null) => this.upgradeService.formatSourceLabel(source);
  formatFundingMode = (mode?: string | null) => this.upgradeService.formatFundingMode(mode);
  formatNetEffect = (effect?: string | null) => this.upgradeService.formatNetWalletEffect(effect);

  getSourceBadgeClass(source?: string | null): string {
    switch (source) {
      case 'GATEWAY':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'WALLET':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'ADMIN':
        return 'bg-violet-50 text-violet-700 border-violet-100';
      case 'REFUND':
        return 'bg-amber-50 text-amber-800 border-amber-100';
      case 'SYSTEM':
        return 'bg-slate-50 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  }

  getEventBadgeClass(eventType?: string | null): string {
    switch (eventType) {
      case 'INITIAL_FEE':
        return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'CATEGORY_UPGRADE':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  }

  getMerchantDisplay(d: MerchantPackageUpgradeDetail): string {
    return d.businessName || d.fullName || d.username;
  }
}
