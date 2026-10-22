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
import { Router, RouterModule } from '@angular/router';
import { TablePageEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PermissionService } from '../../../core/services/permission.service';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { ConfirmationModalComponent } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { AdminCaucusService } from '../services/admin-caucus.service';
import { CaucusMembershipStatus } from '../models/admin-caucus.models';
import { formatLagosDate } from '../utils/caucus-format.util';

@Component({
  selector: 'app-caucus-members-list',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    DialogModule,
    TextareaModule,
    ToastModule,
    DataTableComponent,
    ConfirmationModalComponent,
  ],
  providers: [MessageService],
  templateUrl: './caucus-members-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaucusMembersListComponent implements OnInit {
  private readonly caucusService = inject(AdminCaucusService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  protected readonly permission = inject(PermissionService);

  members = this.caucusService.members;
  total = this.caucusService.membersTotal;
  loading = this.caucusService.membersLoading;
  error = this.caucusService.membersError;

  searchVal = signal('');
  statusFilter = signal<CaucusMembershipStatus | ''>('');
  tableFirst = signal(0);
  pageRows = signal(20);

  showActivateDialog = signal(false);
  activateUsername = signal('');
  activateNote = signal('');
  activating = signal(false);

  showBackfillModal = signal(false);
  backfilling = signal(false);

  canManage = computed(() => this.permission.hasPermission('caucus.manage_members'));

  statusOptions = [
    { label: 'All', value: '' as const },
    { label: 'Active', value: 'ACTIVE' as const },
    { label: 'Deactivated', value: 'DEACTIVATED' as const },
  ];

  tableHeaders = computed(() => [
    'Username',
    'Package',
    'Status',
    'Activated',
    'Deactivated',
    'Appeal',
  ]);

  ngOnInit(): void {
    this.reload();
  }

  formatDate = (iso: string | null) => formatLagosDate(iso);

  openActivate(): void {
    this.activateUsername.set('');
    this.activateNote.set('');
    this.showActivateDialog.set(true);
  }

  submitActivate(): void {
    const username = this.activateUsername().trim();
    if (!username) {
      return;
    }
    this.activating.set(true);
    this.caucusService
      .activate({ username, note: this.activateNote().trim() || undefined })
      .subscribe({
        next: (res) => {
          this.activating.set(false);
          this.showActivateDialog.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Activated',
            detail: `@${res.username} is on the Caucus Team.`,
          });
          void this.router.navigate(['/admin/caucus/members', res.userId]);
        },
        error: (err: Error) => {
          this.activating.set(false);
          this.messageService.add({ severity: 'error', summary: 'Activate failed', detail: err.message });
        },
      });
  }

  confirmBackfill(): void {
    this.backfilling.set(true);
    this.caucusService.backfill().subscribe({
      next: (res) => {
        this.backfilling.set(false);
        this.showBackfillModal.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Backfill complete',
          detail: `Scanned ${res.scanned}, inserted ${res.inserted}, skipped ${res.skipped}.`,
        });
      },
      error: (err: Error) => {
        this.backfilling.set(false);
        this.messageService.add({ severity: 'error', summary: 'Backfill failed', detail: err.message });
      },
    });
  }

  applyFilters(): void {
    this.tableFirst.set(0);
    this.reload();
  }

  onPageChange(event: TablePageEvent): void {
    this.tableFirst.set(event.first ?? 0);
    this.pageRows.set(event.rows ?? 20);
    this.reload();
  }

  private reload(): void {
    const page = Math.floor(this.tableFirst() / this.pageRows()) + 1;
    this.caucusService
      .loadMembers({
        page,
        limit: this.pageRows(),
        search: this.searchVal().trim() || undefined,
        status: this.statusFilter() || undefined,
      })
      .subscribe();
  }
}
