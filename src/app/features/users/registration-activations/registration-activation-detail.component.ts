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
import { UpgradeLedgerEntry } from '../services/package-upgrade-history.service';
import {
  RegistrationActivationDetail,
  RegistrationActivationService,
} from './registration-activation.service';

@Component({
  selector: 'app-registration-activation-detail',
  imports: [CommonModule, RouterModule],
  templateUrl: './registration-activation-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrationActivationDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private activationService = inject(RegistrationActivationService);

  detail = signal<RegistrationActivationDetail | null>(null);
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
        manualRegistrationPaymentId: d.manualRegistrationPaymentId ?? null,
      }
    );
  });

  emptyLedgerMessage = computed(() => {
    const mode = this.funding()?.mode;
    if (mode === 'WAIVE') {
      return 'Complimentary activation — no wallet ledger entries';
    }
    return 'No wallet ledger entries recorded for this activation';
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
    this.activationService.getById(id).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.loadError.set(
          err?.error?.message ?? err?.message ?? 'Failed to load registration activation details'
        );
        this.detail.set(null);
      },
    });
  }

  formatPackage = (pkg: string) => this.activationService.formatPackageLabel(pkg);
  getPackageColor = (pkg: string) => this.activationService.getPackageColor(pkg);
  formatSource = (source?: string | null) => this.activationService.formatSourceLabel(source);
  formatFundingMode = (mode?: string | null) => this.activationService.formatFundingMode(mode);
  formatNetEffect = (effect?: string | null) =>
    this.activationService.formatNetWalletEffect(effect);

  getSourceBadgeClass(source?: string | null): string {
    switch (source) {
      case 'GATEWAY':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'MANUAL_REGISTRATION_PAYMENT':
        return 'bg-amber-50 text-amber-800 border-amber-100';
      case 'ADMIN_DEBIT_WALLET':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'ADMIN_WAIVE':
        return 'bg-violet-50 text-violet-700 border-violet-100';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  }

  getUserDisplay(d: RegistrationActivationDetail): string {
    return d.fullName || d.username;
  }
}
