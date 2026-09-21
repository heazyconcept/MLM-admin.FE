import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PermissionService } from '../../../core/services/permission.service';
import { InfoBannerComponent } from '../../../shared/components/info-banner/info-banner.component';
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
  ],
  providers: [MessageService],
  templateUrl: './legacy-member-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegacyMemberDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly legacyService = inject(AdminLegacyService);
  protected readonly permission = inject(PermissionService);

  detail = this.legacyService.memberDetail;
  loading = this.legacyService.detailLoading;
  error = this.legacyService.detailError;

  canViewWallets = computed(() =>
    this.permission.hasPermission('legacy.view_wallets')
  );

  userId = '';

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
    };
    return map[kind] ?? 'bg-slate-100 text-slate-600';
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
}
