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
  PackageUpgradeDetail,
  PackageUpgradeHistoryService,
  UpgradeLedgerEntry,
} from '../services/package-upgrade-history.service';

@Component({
  selector: 'app-package-upgrade-detail',
  imports: [CommonModule, RouterModule],
  templateUrl: './package-upgrade-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackageUpgradeDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private upgradeHistoryService = inject(PackageUpgradeHistoryService);

  detail = signal<PackageUpgradeDetail | null>(null);
  loading = signal(false);
  loadError = signal<string | null>(null);

  ledgerEntries = computed<UpgradeLedgerEntry[]>(() => this.detail()?.ledgerEntries ?? []);

  funding = computed(() => this.detail()?.funding ?? null);

  links = computed(() => {
    const d = this.detail();
    if (!d) return null;
    return (
      d.links ?? {
        userId: d.userId,
        paymentId: d.paymentId ?? null,
        manualDepositId: d.manualDepositId ?? null,
      }
    );
  });

  emptyLedgerMessage = computed(() => {
    const effect = this.funding()?.netWalletEffect;
    if (effect === 'SETTLED_AS_UPGRADE') {
      return 'Settled as upgrade — no wallet ledger entries';
    }
    if (effect === 'NONE') {
      return 'No wallet movement for this upgrade';
    }
    return 'No wallet ledger entries recorded for this upgrade';
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
    this.upgradeHistoryService.getById(id).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.loadError.set(
          err?.error?.message ?? err?.message ?? 'Failed to load package upgrade details'
        );
        this.detail.set(null);
      },
    });
  }

  formatPackage = (pkg: string) => this.upgradeHistoryService.formatPackageLabel(pkg);
  getPackageColor = (pkg: string) => this.upgradeHistoryService.getPackageColor(pkg);
  formatSource = (source?: string | null) => this.upgradeHistoryService.formatSourceLabel(source);
  formatFundingMode = (mode?: string | null) => this.upgradeHistoryService.formatFundingMode(mode);
  formatNetEffect = (effect?: string | null) =>
    this.upgradeHistoryService.formatNetWalletEffect(effect);

  getSourceBadgeClass(source?: string | null): string {
    switch (source) {
      case 'ADMIN':
        return 'bg-violet-50 text-violet-700 border-violet-100';
      case 'GATEWAY':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'MANUAL_DEPOSIT':
        return 'bg-amber-50 text-amber-800 border-amber-100';
      case 'SYSTEM':
        return 'bg-slate-50 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  }

  getUserDisplay(d: PackageUpgradeDetail): string {
    return d.fullName || d.username;
  }

  getStageDisplay(d: PackageUpgradeDetail): string {
    if (d.stage == null) return d.rankName ?? '—';
    const rank = d.rankName ? ` · ${d.rankName}` : '';
    return `Stage ${d.stage}${rank}`;
  }
}
