import {
  Component,
  inject,
  computed,
  signal,
  ChangeDetectionStrategy,
  OnInit,
  DestroyRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { TablePageEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ConsultantService,
  BusinessConsultant,
  ConsultantStatus,
  AdminConsultantFilters,
  GrantConsultantRequest
} from '../services/consultant.service';
import { PermissionService } from '../../../core/services/permission.service';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ConfirmationModalComponent, ConfirmationResult } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { ConsultantGrantModalComponent } from '../modals/consultant-grant-modal.component';
import { ConsultantRejectModalComponent } from '../modals/consultant-reject-modal.component';

@Component({
  selector: 'app-consultants-list',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    DataTableComponent,
    StatusBadgeComponent,
    ButtonModule,
    ToastModule,
    ConfirmationModalComponent,
    ConsultantGrantModalComponent,
    ConsultantRejectModalComponent
  ],
  providers: [MessageService],
  templateUrl: './consultants-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConsultantsListComponent implements OnInit {
  private consultantService = inject(ConsultantService);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private destroyRef = inject(DestroyRef);
  protected permission = inject(PermissionService);

  consultants = this.consultantService.consultants;
  listTotal = this.consultantService.listTotal;
  loading = this.consultantService.loading;

  selectedStatusControl = new FormControl<string>('PENDING');
  searchVal = signal('');
  searchQuery = signal('');

  tableFirst = signal(0);
  pageRows = signal(20);
  actionLoading = signal(false);

  showGrantModal = signal(false);
  showRejectModal = signal(false);
  showConfirmModal = signal(false);

  selectedConsultant = signal<BusinessConsultant | null>(null);
  confirmAction = signal<'approve' | 'revoke' | null>(null);

  canApprove = computed(() => this.permission.hasPermission('consultants.approve'));

  statusOptions = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'Revoked', value: 'REVOKED' }
  ];

  tableHeaders = signal([
    'Applicant',
    'Seminar Centre',
    'Rank / Stage 1',
    'Package',
    'Status',
    'Applied',
    'Actions'
  ]);

  stats = computed(() => ({
    pending: this.consultantService.pendingCount(),
    approved: this.consultantService.approvedCount(),
    rejected: this.consultantService.rejectedCount(),
    revoked: this.consultantService.revokedCount(),
    total: this.consultantService.listTotal()
  }));

  confirmConfig = computed(() => {
    const action = this.confirmAction();
    if (action === 'approve') {
      return {
        title: 'Approve Consultant',
        message: 'Approve this application? The user will become an active business consultant and receive commissions.',
        confirmLabel: 'Approve',
        confirmClass: 'p-button-success'
      };
    }
    if (action === 'revoke') {
      return {
        title: 'Revoke Consultant',
        message: 'Revoke this consultant\'s active status? They will no longer receive future commissions.',
        confirmLabel: 'Revoke',
        confirmClass: 'p-button-danger'
      };
    }
    return {
      title: 'Confirm',
      message: 'Are you sure?',
      confirmLabel: 'Confirm',
      confirmClass: 'p-button-primary'
    };
  });

  ngOnInit(): void {
    this.fetchConsultants();

    this.selectedStatusControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.tableFirst.set(0);
        this.fetchConsultants();
      });
  }

  private buildFilters(): AdminConsultantFilters {
    const status = this.selectedStatusControl.value;
    const filters: AdminConsultantFilters = {
      limit: this.pageRows(),
      offset: this.tableFirst()
    };
    if (status && status !== 'all') {
      filters.status = status as ConsultantStatus;
    }
    const search = this.searchQuery();
    if (search) filters.search = search;
    return filters;
  }

  fetchConsultants(): void {
    this.consultantService.loadConsultants(this.buildFilters()).subscribe();
  }

  onPageChange(event: TablePageEvent): void {
    this.tableFirst.set(event.first);
    this.pageRows.set(event.rows);
    this.fetchConsultants();
  }

  onSearch(): void {
    this.searchQuery.set(this.searchVal().trim());
    this.tableFirst.set(0);
    this.fetchConsultants();
  }

  viewDetails(consultant: BusinessConsultant): void {
    this.router.navigate(['/admin/consultants', consultant.id]);
  }

  openGrantModal(): void {
    this.showGrantModal.set(true);
  }

  onGrantRequest(body: GrantConsultantRequest): void {
    this.actionLoading.set(true);
    this.consultantService.grantConsultant(body).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Consultant Granted',
          detail: 'Business consultant status has been granted successfully.'
        });
        this.showGrantModal.set(false);
        this.actionLoading.set(false);
        this.fetchConsultants();
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Grant Failed',
          detail: err?.error?.message ?? err?.message ?? 'Failed to grant consultant status'
        });
        this.actionLoading.set(false);
      }
    });
  }

  onGrantCancelled(): void {
    this.showGrantModal.set(false);
  }

  openApprove(consultant: BusinessConsultant, event?: Event): void {
    event?.stopPropagation();
    this.selectedConsultant.set(consultant);
    this.confirmAction.set('approve');
    this.showConfirmModal.set(true);
  }

  openReject(consultant: BusinessConsultant, event?: Event): void {
    event?.stopPropagation();
    this.selectedConsultant.set(consultant);
    this.showRejectModal.set(true);
  }

  openRevoke(consultant: BusinessConsultant, event?: Event): void {
    event?.stopPropagation();
    this.selectedConsultant.set(consultant);
    this.confirmAction.set('revoke');
    this.showConfirmModal.set(true);
  }

  handleConfirm(result: ConfirmationResult): void {
    if (!result.confirmed) return;
    const consultant = this.selectedConsultant();
    const action = this.confirmAction();
    if (!consultant || !action) return;

    this.actionLoading.set(true);
    this.showConfirmModal.set(false);

    const request$ = action === 'approve'
      ? this.consultantService.approveConsultant(consultant.id)
      : this.consultantService.revokeConsultant(consultant.id);

    request$.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: action === 'approve' ? 'Application Approved' : 'Consultant Revoked',
          detail: action === 'approve'
            ? 'The user is now an active business consultant.'
            : 'Consultant status has been revoked.'
        });
        this.actionLoading.set(false);
        this.fetchConsultants();
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Action Failed',
          detail: err?.error?.message ?? err?.message ?? 'Failed to complete action'
        });
        this.actionLoading.set(false);
      }
    });
  }

  handleRejectConfirmed(reason: string): void {
    const consultant = this.selectedConsultant();
    if (!consultant) return;

    this.actionLoading.set(true);
    this.showRejectModal.set(false);

    this.consultantService.rejectConsultant(consultant.id, reason).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Application Rejected',
          detail: 'The applicant has been notified and may re-apply.'
        });
        this.actionLoading.set(false);
        this.fetchConsultants();
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Rejection Failed',
          detail: err?.error?.message ?? err?.message ?? 'Failed to reject application'
        });
        this.actionLoading.set(false);
      }
    });
  }

  handleRejectCancelled(): void {
    this.showRejectModal.set(false);
  }

  handleConfirmCancelled(): void {
    this.showConfirmModal.set(false);
  }

  getStatusDisplay(status: ConsultantStatus): string {
    return this.consultantService.getDisplayStatus(status);
  }

  getApplicantName(consultant: BusinessConsultant): string {
    return this.consultantService.getApplicantDisplayName(consultant);
  }
}
