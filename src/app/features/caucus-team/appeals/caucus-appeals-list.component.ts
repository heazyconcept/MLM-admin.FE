import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TablePageEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PermissionService } from '../../../core/services/permission.service';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import {
  ConfirmationModalComponent,
  ConfirmationResult,
} from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { AdminCaucusService } from '../services/admin-caucus.service';
import { AdminCaucusAppealInboxItem, CaucusAppealStatus } from '../models/admin-caucus.models';
import { formatLagosDate } from '../utils/caucus-format.util';

@Component({
  selector: 'app-caucus-appeals-list',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    SelectModule,
    ToastModule,
    DataTableComponent,
    ConfirmationModalComponent,
  ],
  providers: [MessageService],
  templateUrl: './caucus-appeals-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaucusAppealsListComponent implements OnInit {
  private readonly caucusService = inject(AdminCaucusService);
  private readonly messageService = inject(MessageService);
  protected readonly permission = inject(PermissionService);

  appeals = this.caucusService.appeals;
  total = this.caucusService.appealsTotal;
  loading = this.caucusService.appealsLoading;
  error = this.caucusService.appealsError;

  statusFilter = signal<CaucusAppealStatus | ''>('PENDING');
  tableFirst = signal(0);
  pageRows = signal(20);

  pendingDismiss = signal<AdminCaucusAppealInboxItem | null>(null);
  pendingReinstate = signal<AdminCaucusAppealInboxItem | null>(null);
  showDismissModal = signal(false);
  showReinstateModal = signal(false);
  actionLoading = signal(false);

  canManage = computed(() => this.permission.hasPermission('caucus.manage_members'));

  statusOptions = [
    { label: 'Pending', value: 'PENDING' as const },
    { label: 'Dismissed', value: 'DISMISSED' as const },
    { label: 'Closed by reinstate', value: 'CLOSED_BY_REINSTATE' as const },
    { label: 'All', value: '' as const },
  ];

  tableHeaders = computed(() => ['Username', 'Message', 'Submitted', 'Status', '']);

  ngOnInit(): void {
    this.reload();
  }

  formatDate = (iso: string) => formatLagosDate(iso, true);

  onPageChange(event: TablePageEvent): void {
    this.tableFirst.set(event.first ?? 0);
    this.pageRows.set(event.rows ?? 20);
    this.reload();
  }

  openDismiss(row: AdminCaucusAppealInboxItem): void {
    this.pendingDismiss.set(row);
    this.showDismissModal.set(true);
  }

  openReinstate(row: AdminCaucusAppealInboxItem): void {
    this.pendingReinstate.set(row);
    this.showReinstateModal.set(true);
  }

  confirmDismiss(result: ConfirmationResult): void {
    const row = this.pendingDismiss();
    if (!result.confirmed || !row) {
      this.showDismissModal.set(false);
      return;
    }
    this.actionLoading.set(true);
    this.caucusService.dismissAppeal(row.id, { note: result.reason }).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.showDismissModal.set(false);
        this.messageService.add({ severity: 'success', summary: 'Dismissed', detail: 'Appeal dismissed.' });
        this.reload();
      },
      error: (err: Error) => {
        this.actionLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Failed', detail: err.message });
        this.reload();
      },
    });
  }

  confirmReinstate(result: ConfirmationResult): void {
    const row = this.pendingReinstate();
    if (!result.confirmed || !row) {
      this.showReinstateModal.set(false);
      return;
    }
    this.actionLoading.set(true);
    this.caucusService.reinstate(row.userId, { note: result.reason }).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.showReinstateModal.set(false);
        this.messageService.add({ severity: 'success', summary: 'Reinstated', detail: `@${row.username} is active again.` });
        this.reload();
      },
      error: (err: Error) => {
        this.actionLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Failed', detail: err.message });
        this.reload();
      },
    });
  }

  reload(): void {
    const page = Math.floor(this.tableFirst() / this.pageRows()) + 1;
    this.caucusService
      .loadAppeals({
        page,
        limit: this.pageRows(),
        status: this.statusFilter() || undefined,
      })
      .subscribe();
  }
}
