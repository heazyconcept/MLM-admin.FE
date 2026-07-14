import {
  Component,
  inject,
  computed,
  signal,
  ChangeDetectionStrategy,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { ConfirmationModalComponent } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import {
  MerchantAllocationService,
  HandoverRequest,
  HandoverStatus,
} from '../services/merchant-allocation.service';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TablePageEvent } from 'primeng/table';

interface StatusOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-handover-requests-list',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    DataTableComponent,
    ConfirmationModalComponent,
    HasPermissionDirective,
    ButtonModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './handover-requests-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HandoverRequestsListComponent implements OnInit {
  private allocationService = inject(MerchantAllocationService);
  private messageService = inject(MessageService);
  private destroyRef = inject(DestroyRef);

  requests = this.allocationService.handoverRequests;
  totalRecords = this.allocationService.handoverRequestsTotal;
  tableLoading = this.allocationService.handoverLoading;

  rowsPerPage = signal(10);
  firstRecord = signal(0);
  selectedStatusControl = new FormControl('SUPPLIER_APPROVED');
  merchantIdFilter = signal('');

  showApproveModal = signal(false);
  showRejectModal = signal(false);
  selectedRequest = signal<HandoverRequest | null>(null);
  actionLoading = signal(false);

  statusOptions: StatusOption[] = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Requested', value: 'REQUESTED' },
    { label: 'Supplier Approved', value: 'SUPPLIER_APPROVED' },
    { label: 'Admin Approved', value: 'ADMIN_APPROVED' },
    { label: 'Ready for Pickup', value: 'READY_FOR_PICKUP' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Rejected', value: 'REJECTED' },
  ];

  tableHeaders = signal([
    'Product',
    'Qty',
    'Receiver',
    'Supplier',
    'Handover Status',
    'Dates',
    'Actions',
  ]);

  stats = computed(() => {
    const all = this.requests();
    return {
      awaitingAdmin: all.filter((r) => r.handoverStatus === 'SUPPLIER_APPROVED').length,
      approved: all.filter((r) => r.handoverStatus === 'ADMIN_APPROVED').length,
      rejected: all.filter((r) => r.handoverStatus === 'REJECTED').length,
    };
  });

  ngOnInit(): void {
    this.selectedStatusControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.firstRecord.set(0);
        this.loadRequests();
      });

    this.loadRequests();
  }

  loadRequests(): void {
    const status = this.selectedStatusControl.value;
    const merchantId = this.merchantIdFilter().trim();

    this.allocationService
      .getHandoverRequests({
        status:
          status && status !== 'all' ? (status as HandoverStatus) : undefined,
        merchantId: merchantId || undefined,
        limit: this.rowsPerPage(),
        offset: this.firstRecord(),
      })
      .subscribe();
  }

  onSearch(): void {
    this.firstRecord.set(0);
    this.loadRequests();
  }

  onPageChange(event: TablePageEvent): void {
    this.firstRecord.set(event.first ?? 0);
    this.rowsPerPage.set(event.rows ?? 10);
    this.loadRequests();
  }

  onApprove(request: HandoverRequest): void {
    this.selectedRequest.set(request);
    this.showApproveModal.set(true);
  }

  onReject(request: HandoverRequest): void {
    this.selectedRequest.set(request);
    this.showRejectModal.set(true);
  }

  handleApproveConfirm(event: { confirmed: boolean; reason?: string }): void {
    const request = this.selectedRequest();
    if (!event.confirmed || !request) {
      this.showApproveModal.set(false);
      return;
    }

    this.actionLoading.set(true);
    this.allocationService.approveHandoverRequest(request.id).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.showApproveModal.set(false);
        this.selectedRequest.set(null);
        this.loadRequests();
        this.messageService.add({
          severity: 'success',
          summary: 'Handover Approved',
          detail: 'Supplier can now mark stock ready for pickup.',
        });
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Approve Failed',
          detail: err?.error?.message ?? 'Failed to approve handover request',
        });
      },
    });
  }

  handleRejectConfirm(event: { confirmed: boolean; reason?: string }): void {
    const request = this.selectedRequest();
    if (!event.confirmed || !request) {
      this.showRejectModal.set(false);
      return;
    }

    this.actionLoading.set(true);
    this.allocationService
      .rejectHandoverRequest(request.id, (event.reason ?? '').trim() || undefined)
      .subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.showRejectModal.set(false);
          this.selectedRequest.set(null);
          this.loadRequests();
          this.messageService.add({
            severity: 'success',
            summary: 'Handover Rejected',
            detail: 'The receiver may request a different supplier.',
          });
        },
        error: (err) => {
          this.actionLoading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Reject Failed',
            detail: err?.error?.message ?? 'Failed to reject handover request',
          });
        },
      });
  }

  canAct(request: HandoverRequest): boolean {
    return request.handoverStatus === 'SUPPLIER_APPROVED';
  }

  getReceiverDisplay(request: HandoverRequest): string {
    return (
      request.receiverMerchant?.businessName ??
      request.merchantId ??
      '—'
    );
  }

  getSupplierDisplay(request: HandoverRequest): string {
    return (
      request.sourceMerchant?.businessName ??
      request.sourceMerchantId ??
      '—'
    );
  }

  getHandoverStatusLabel(status: HandoverStatus): string {
    return this.allocationService.getHandoverStatusLabel(status);
  }

  getHandoverStatusClass(status: HandoverStatus): string {
    const map: Record<HandoverStatus, string> = {
      NONE: 'bg-gray-50 text-gray-500 border-gray-200',
      REQUESTED: 'bg-amber-50 text-amber-700 border-amber-200',
      SUPPLIER_APPROVED: 'bg-blue-50 text-blue-700 border-blue-200',
      ADMIN_APPROVED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      READY_FOR_PICKUP: 'bg-purple-50 text-purple-700 border-purple-200',
      COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      REJECTED: 'bg-red-50 text-red-700 border-red-200',
    };
    return map[status] ?? 'bg-gray-50 text-gray-500 border-gray-200';
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
