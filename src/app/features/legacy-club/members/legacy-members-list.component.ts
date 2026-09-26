import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TablePageEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PermissionService } from '../../../core/services/permission.service';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import {
  ConfirmationModalComponent,
  ConfirmationResult,
} from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { LegacyWaiveJoinModalComponent } from '../modals/legacy-waive-join-modal.component';
import { AdminLegacyService } from '../services/admin-legacy.service';
import {
  AdminLegacyMemberListItem,
  LegacyPackageCode,
  LegacySponsorSource,
} from '../models/admin-legacy.models';

@Component({
  selector: 'app-legacy-members-list',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    ToastModule,
    DataTableComponent,
    ConfirmationModalComponent,
    LegacyWaiveJoinModalComponent,
  ],
  providers: [MessageService],
  templateUrl: './legacy-members-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegacyMembersListComponent implements OnInit {
  private readonly legacyService = inject(AdminLegacyService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  protected readonly permission = inject(PermissionService);

  members = this.legacyService.members;
  total = this.legacyService.membersTotal;
  loading = this.legacyService.membersLoading;
  error = this.legacyService.membersError;

  searchVal = signal('');
  packageFilter = signal<LegacyPackageCode | ''>('');
  sponsorSourceFilter = signal<LegacySponsorSource | ''>('');
  tableFirst = signal(0);
  pageRows = signal(20);
  showCancelModal = signal(false);
  showWaiveModal = signal(false);
  cancelling = signal(false);
  waiving = signal(false);
  cancellingUserId = signal<string | null>(null);
  waivingUserId = signal<string | null>(null);
  pendingCancelMember = signal<AdminLegacyMemberListItem | null>(null);
  pendingWaiveMember = signal<AdminLegacyMemberListItem | null>(null);

  canEnroll = computed(() =>
    this.permission.hasPermission('legacy.enroll_seed')
  );
  canViewWallets = computed(() =>
    this.permission.hasPermission('legacy.view_wallets')
  );
  canCancelJoin = computed(
    () =>
      this.permission.hasPermission('legacy.cancel_pending_join') ||
      this.permission.hasPermission('legacy.view_members'),
  );
  canWaiveJoin = computed(
    () =>
      this.permission.hasPermission('legacy.waive_join') ||
      this.permission.hasPermission('legacy.enroll_seed'),
  );

  cancelModalMessage = computed(() => {
    const row = this.pendingCancelMember();
    if (!row) {
      return 'This removes the pending Legacy Club join. The user will need to start registration again.';
    }
    return `Cancel pending Legacy registration for @${row.username}? They will be notified and can start again.`;
  });

  packageOptions: { label: string; value: LegacyPackageCode | '' }[] = [
    { label: 'All packages', value: '' },
    { label: 'VIP', value: 'VIP' },
    { label: 'Executive', value: 'EXECUTIVE' },
    { label: 'Supreme', value: 'SUPREME' },
  ];

  placementOptions: { label: string; value: LegacySponsorSource | '' }[] = [
    { label: 'All placements', value: '' },
    { label: 'AUTO', value: 'AUTO' },
    { label: 'CHOSEN', value: 'CHOSEN' },
    { label: 'SEED', value: 'SEED' },
  ];

  tableHeaders = computed(() => [
    'Username',
    'Status',
    'Segulah',
    'Legacy',
    'Sponsor',
    'Placement',
    'Successlines',
    'Progress',
    'Pending',
    'Next rate',
    ...(this.canViewWallets() ? ['Legacy account', 'Legacy voucher'] : []),
    'Joined',
    'Actions',
  ]);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const page = Math.floor(this.tableFirst() / this.pageRows()) + 1;
    this.legacyService
      .loadMembers({
        page,
        limit: this.pageRows(),
        search: this.searchVal(),
        package: this.packageFilter(),
        sponsorSource: this.sponsorSourceFilter(),
      })
      .subscribe();
  }

  onSearch(): void {
    this.tableFirst.set(0);
    this.load();
  }

  onFilterChange(): void {
    this.tableFirst.set(0);
    this.load();
  }

  onPageChange(event: TablePageEvent): void {
    this.tableFirst.set(event.first ?? 0);
    this.pageRows.set(event.rows ?? 20);
    this.load();
  }

  openDetail(row: AdminLegacyMemberListItem): void {
    void this.router.navigate(['/admin/legacy/members', row.userId]);
  }

  canCancelRow(row: AdminLegacyMemberListItem): boolean {
    return this.canCancelJoin() && row.status === 'PENDING_JOIN';
  }

  canWaiveRow(row: AdminLegacyMemberListItem): boolean {
    return this.canWaiveJoin() && row.status === 'PENDING_JOIN';
  }

  isRowCancelling(row: AdminLegacyMemberListItem): boolean {
    return this.cancellingUserId() === row.userId;
  }

  isRowWaiving(row: AdminLegacyMemberListItem): boolean {
    return this.waivingUserId() === row.userId;
  }

  requestCancelJoin(row: AdminLegacyMemberListItem, event: Event): void {
    event.stopPropagation();
    this.pendingCancelMember.set(row);
    this.showCancelModal.set(true);
  }

  closeCancelModal(): void {
    if (!this.cancelling()) {
      this.showCancelModal.set(false);
      this.pendingCancelMember.set(null);
    }
  }

  confirmCancelJoin(result: ConfirmationResult): void {
    const row = this.pendingCancelMember();
    if (!result.confirmed || !result.reason?.trim() || !row) return;

    this.cancelling.set(true);
    this.cancellingUserId.set(row.userId);
    this.legacyService.cancelPendingJoin(row.userId, { reason: result.reason.trim() }).subscribe({
      next: (res) => {
        this.cancelling.set(false);
        this.cancellingUserId.set(null);
        this.showCancelModal.set(false);
        this.pendingCancelMember.set(null);
        this.messageService.add({
          severity: 'success',
          summary: 'Registration cancelled',
          detail: `@${res.username ?? row.username} can start Legacy join again.`,
        });
        this.load();
      },
      error: (err: unknown) => {
        this.cancelling.set(false);
        this.cancellingUserId.set(null);
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

  requestWaiveJoin(row: AdminLegacyMemberListItem, event: Event): void {
    event.stopPropagation();
    this.pendingWaiveMember.set(row);
    this.showWaiveModal.set(true);
  }

  closeWaiveModal(): void {
    if (!this.waiving()) {
      this.showWaiveModal.set(false);
      this.pendingWaiveMember.set(null);
    }
  }

  confirmWaiveJoin(reason: string): void {
    const row = this.pendingWaiveMember();
    if (!row) return;

    this.waiving.set(true);
    this.waivingUserId.set(row.userId);
    this.legacyService.waivePendingJoin(row.userId, { reason }).subscribe({
      next: (res) => {
        this.waiving.set(false);
        this.waivingUserId.set(null);
        this.showWaiveModal.set(false);
        this.pendingWaiveMember.set(null);
        this.messageService.add({
          severity: 'success',
          summary: 'Legacy activated',
          detail: `@${res.username ?? row.username} is now an ACTIVE Legacy member.`,
        });
        this.load();
      },
      error: (err: unknown) => {
        this.waiving.set(false);
        this.waivingUserId.set(null);
        const http = err as { error?: { message?: string | string[] } };
        const msg = http?.error?.message;
        this.messageService.add({
          severity: 'error',
          summary: 'Activation failed',
          detail: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Could not waive and activate.',
        });
      },
    });
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  monthProgress(row: AdminLegacyMemberListItem): string {
    const issued = row.issuedCount ?? 0;
    if (row.cycleWeeks != null && row.cycleWeeks > 0) {
      return `${issued}/${row.cycleWeeks}`;
    }
    const cycle = row.cycleMonths ?? 6;
    return `${issued}/${cycle}`;
  }

  formatMoney(
    value: number | null | undefined,
    currency: string | undefined = 'NGN'
  ): string {
    if (value == null) return '—';
    const prefix = currency === 'USD' ? '$' : '₦';
    return `${prefix}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }

  packageLabel(code: string | undefined): string {
    if (!code) return '—';
    const labels: Record<string, string> = {
      VIP: 'VIP',
      EXECUTIVE: 'Executive',
      SUPREME: 'Supreme',
    };
    return labels[code] ?? code;
  }

  statusClass(status: string | undefined): string {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-100 text-emerald-800';
      case 'PENDING_JOIN':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  statusLabel(status: string | undefined): string {
    if (!status) return '—';
    if (status === 'PENDING_JOIN') return 'Pending join';
    return status;
  }

  retry(): void {
    this.load();
  }
}
