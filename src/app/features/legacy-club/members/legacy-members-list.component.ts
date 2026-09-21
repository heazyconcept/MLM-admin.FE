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
  ],
  providers: [MessageService],
  templateUrl: './legacy-members-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegacyMembersListComponent implements OnInit {
  private readonly legacyService = inject(AdminLegacyService);
  private readonly router = inject(Router);
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

  canEnroll = computed(() =>
    this.permission.hasPermission('legacy.enroll_seed')
  );
  canViewWallets = computed(() =>
    this.permission.hasPermission('legacy.view_wallets')
  );

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
    'Segulah',
    'Legacy',
    'Sponsor',
    'Placement',
    'Successlines',
    ...(this.canViewWallets() ? ['Legacy account', 'Legacy voucher'] : []),
    'Joined',
    'Progress',
    'Pending',
    'Next rate',
    'Last Autoship',
    'Cycle start',
    'Last event',
    'Qualified',
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
    if (row.issuedCount == null || row.cycleMonths == null) return '—';
    return `${row.issuedCount}/${row.cycleMonths}`;
  }

  formatMoney(value: number | null | undefined): string {
    if (value == null) return '—';
    return `₦${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
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

  retry(): void {
    this.load();
  }
}
