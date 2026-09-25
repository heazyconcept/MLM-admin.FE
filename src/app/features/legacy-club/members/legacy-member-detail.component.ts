import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PermissionService } from '../../../core/services/permission.service';
import { InfoBannerComponent } from '../../../shared/components/info-banner/info-banner.component';
import {
  ConfirmationModalComponent,
  ConfirmationResult,
} from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { AdminLegacyService } from '../services/admin-legacy.service';
import {
  AdminLegacyEvent,
  AdminLegacyPeriod,
  AdminLegacyPriorPending,
} from '../models/admin-legacy.models';

@Component({
  selector: 'app-legacy-member-detail',
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    ToastModule,
    InfoBannerComponent,
    ConfirmationModalComponent,
  ],
  providers: [MessageService],
  templateUrl: './legacy-member-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegacyMemberDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly legacyService = inject(AdminLegacyService);
  private readonly messageService = inject(MessageService);
  protected readonly permission = inject(PermissionService);

  detail = this.legacyService.memberDetail;
  loading = this.legacyService.detailLoading;
  error = this.legacyService.detailError;

  canViewWallets = computed(() =>
    this.permission.hasPermission('legacy.view_wallets')
  );

  userId = '';
  showCancelModal = signal(false);
  cancelling = signal(false);

  isPendingJoin = computed(() => this.detail()?.status === 'PENDING_JOIN');

  canCancelJoin = computed(
    () =>
      this.isPendingJoin() &&
      (this.permission.hasPermission('legacy.cancel_pending_join') ||
        this.permission.hasPermission('legacy.view_members')),
  );

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('userId') ?? '';
    if (this.userId) {
      this.legacyService.loadMemberDetail(this.userId).subscribe();
    }
  }

  retry(): void {
    if (this.userId) {
      this.legacyService.loadMemberDetail(this.userId).subscribe();
    }
  }

  packageLabel(code: string | undefined | null): string {
    if (!code) return '—';
    const labels: Record<string, string> = {
      VIP: 'VIP',
      EXECUTIVE: 'Executive',
      SUPREME: 'Supreme',
    };
    return labels[code] ?? code;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatMoney(value: number | null | undefined, currency = 'NGN'): string {
    if (value == null) return '—';
    const prefix = currency === 'USD' ? '$' : '₦';
    return `${prefix}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }

  statusClass(status: string | undefined): string {
    switch (status) {
      case 'DROPPED':
        return 'bg-emerald-100 text-emerald-800';
      case 'PENDING':
        return 'bg-amber-100 text-amber-800';
      case 'SCHEDULED':
        return 'bg-slate-100 text-slate-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  rateTierClass(tier: string | undefined): string {
    return tier === 'INCREASED'
      ? 'bg-violet-100 text-violet-800'
      : 'bg-sky-100 text-sky-800';
  }

  eventKindClass(kind: string): string {
    const map: Record<string, string> = {
      JOIN: 'bg-emerald-100 text-emerald-800',
      SEED: 'bg-amber-100 text-amber-800',
      UPGRADE: 'bg-sky-100 text-sky-800',
      REACTIVATE: 'bg-violet-100 text-violet-800',
      JOIN_CANCELLED: 'bg-red-100 text-red-800',
    };
    return map[kind] ?? 'bg-slate-100 text-slate-600';
  }

  membershipStatusClass(status: string | undefined): string {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-100 text-emerald-800';
      case 'PENDING_JOIN':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  membershipStatusLabel(status: string | undefined): string {
    if (!status) return 'Unknown';
    if (status === 'PENDING_JOIN') return 'Pending join';
    return status;
  }

  openCancelModal(): void {
    this.showCancelModal.set(true);
  }

  closeCancelModal(): void {
    if (!this.cancelling()) {
      this.showCancelModal.set(false);
    }
  }

  confirmCancelJoin(result: ConfirmationResult): void {
    if (!result.confirmed || !result.reason?.trim() || !this.userId) return;

    this.cancelling.set(true);
    this.legacyService.cancelPendingJoin(this.userId, { reason: result.reason.trim() }).subscribe({
      next: (res) => {
        this.cancelling.set(false);
        this.showCancelModal.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Registration cancelled',
          detail: `@${res.username ?? this.detail()?.username ?? 'member'} can start Legacy join again.`,
        });
        this.legacyService.loadMemberDetail(this.userId).subscribe();
      },
      error: (err: unknown) => {
        this.cancelling.set(false);
        const http = err as { error?: { message?: string | string[] } };
        const msg = http?.error?.message;
        this.messageService.add({
          severity: 'error',
          summary: 'Cancel failed',
          detail: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not cancel registration.',
        });
      },
    });
  }

  periods(): AdminLegacyPeriod[] {
    return this.detail()?.periods ?? [];
  }

  priorPending(): AdminLegacyPriorPending[] {
    return this.detail()?.priorPending ?? [];
  }

  events(): AdminLegacyEvent[] {
    return this.detail()?.events ?? [];
  }

  successlines() {
    return this.detail()?.successlines ?? [];
  }

  /** Prefer API cycleWeeks; default 24 when periods look weekly. */
  cycleWeeksTotal(): number {
    const m = this.detail();
    if (!m) return 24;
    if (m.cycleWeeks != null && m.cycleWeeks > 0) return m.cycleWeeks;
    const periods = m.periods ?? [];
    if (periods.length > 6) return 24;
    return m.cycleMonths != null && m.cycleMonths > 0 ? m.cycleMonths * 4 : 24;
  }

  weekProgressLabel(): string {
    const m = this.detail();
    if (!m) return '';
    const issued = m.issuedCount ?? 0;
    return `week ${issued} of ${this.cycleWeeksTotal()}`;
  }
}
