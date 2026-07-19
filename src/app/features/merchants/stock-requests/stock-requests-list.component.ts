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
  StockRequest,
  AllocationStatus,
  AllocationSource,
} from '../services/merchant-allocation.service';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TablePageEvent } from 'primeng/table';

interface StatusOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-stock-requests-list',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    DataTableComponent,
    ConfirmationModalComponent,
    HasPermissionDirective,
    ButtonModule,
    DialogModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './stock-requests-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockRequestsListComponent implements OnInit {
  private allocationService = inject(MerchantAllocationService);
  private messageService = inject(MessageService);
  private destroyRef = inject(DestroyRef);

  requests = this.allocationService.stockRequests;
  totalRecords = this.allocationService.stockRequestsTotal;
  tableLoading = this.allocationService.stockRequestsLoading;

  rowsPerPage = signal(10);
  firstRecord = signal(0);
  selectedStatusControl = new FormControl('all');
  merchantIdFilter = signal('');
  productIdFilter = signal('');

  showRejectModal = signal(false);
  showDispatchModal = signal(false);
  showInTransitModal = signal(false);
  showDeliveredModal = signal(false);
  selectedRequest = signal<StockRequest | null>(null);
  actionLoading = signal(false);
  dispatchLoading = signal(false);
  statusUpdateLoading = signal(false);
  dispatchNotes = signal('');
  trackingReference = signal('');

  statusOptions: StatusOption[] = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Dispatched', value: 'DISPATCHED' },
    { label: 'In Transit', value: 'IN_TRANSIT' },
    { label: 'Delivered', value: 'DELIVERED' },
    { label: 'Received', value: 'RECEIVED' },
    { label: 'Accepted', value: 'ACCEPTED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  tableHeaders = signal([
    'Merchant',
    'Product',
    'Qty',
    'Notes',
    'Status',
    'Source',
    'Requested',
    'Actions',
  ]);

  stats = computed(() => {
    const all = this.requests();
    return {
      pending: all.filter((r) => r.status === 'PENDING').length,
      inFlight: all.filter((r) =>
        ['DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'RECEIVED', 'ACCEPTED'].includes(r.status)
      ).length,
      cancelled: all.filter((r) => r.status === 'CANCELLED').length,
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
    const productId = this.productIdFilter().trim();

    const isAllStatuses = !status || status === 'all';

    this.allocationService
      .getStockRequests({
        status: isAllStatuses ? undefined : (status as AllocationStatus),
        allStatuses: isAllStatuses,
        merchantId: merchantId || undefined,
        productId: productId || undefined,
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

  onDispatch(request: StockRequest): void {
    this.selectedRequest.set(request);
    this.dispatchNotes.set('');
    this.trackingReference.set('');
    this.showDispatchModal.set(true);
  }

  handleDispatchCancel(): void {
    this.showDispatchModal.set(false);
    this.selectedRequest.set(null);
    this.dispatchNotes.set('');
    this.trackingReference.set('');
  }

  handleDispatchConfirm(): void {
    const request = this.selectedRequest();
    if (!request) return;

    this.dispatchLoading.set(true);
    this.allocationService
      .dispatchAllocation(request.merchantId, request.id, {
        dispatchNotes: this.dispatchNotes().trim() || undefined,
        trackingReference: this.trackingReference().trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.dispatchLoading.set(false);
          this.handleDispatchCancel();
          this.loadRequests();
          this.messageService.add({
            severity: 'success',
            summary: 'Stock Dispatched',
            detail: `${request.productName} has been dispatched to the merchant.`,
          });
        },
        error: (err) => {
          this.dispatchLoading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Dispatch Failed',
            detail: err?.error?.message ?? 'Failed to dispatch stock request',
          });
        },
      });
  }

  onReject(request: StockRequest): void {
    this.selectedRequest.set(request);
    this.showRejectModal.set(true);
  }

  handleRejectConfirm(event: { confirmed: boolean; reason?: string }): void {
    const request = this.selectedRequest();
    if (!event.confirmed || !request) {
      this.showRejectModal.set(false);
      return;
    }

    this.actionLoading.set(true);
    this.allocationService
      .rejectStockRequest(request.id, (event.reason ?? '').trim() || undefined)
      .subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.showRejectModal.set(false);
          this.selectedRequest.set(null);
          this.loadRequests();
          this.messageService.add({
            severity: 'success',
            summary: 'Stock Request Rejected',
            detail: 'The merchant has been notified.',
          });
        },
        error: (err) => {
          this.actionLoading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Reject Failed',
            detail: err?.error?.message ?? 'Failed to reject stock request',
          });
        },
      });
  }

  onMarkInTransit(request: StockRequest): void {
    this.selectedRequest.set(request);
    this.showInTransitModal.set(true);
  }

  onMarkDelivered(request: StockRequest): void {
    this.selectedRequest.set(request);
    this.showDeliveredModal.set(true);
  }

  handleInTransitConfirm(event: { confirmed: boolean }): void {
    if (event.confirmed) {
      this.updateAllocationStatus('IN_TRANSIT');
    } else {
      this.showInTransitModal.set(false);
    }
  }

  handleDeliveredConfirm(event: { confirmed: boolean }): void {
    if (event.confirmed) {
      this.updateAllocationStatus('DELIVERED');
    } else {
      this.showDeliveredModal.set(false);
    }
  }

  private updateAllocationStatus(status: 'IN_TRANSIT' | 'DELIVERED'): void {
    const request = this.selectedRequest();
    if (!request) return;

    this.statusUpdateLoading.set(true);
    this.allocationService
      .updateAllocationStatus(request.merchantId, request.id, status)
      .subscribe({
        next: () => {
          this.statusUpdateLoading.set(false);
          this.showInTransitModal.set(false);
          this.showDeliveredModal.set(false);
          this.selectedRequest.set(null);
          this.loadRequests();
          const label = status === 'IN_TRANSIT' ? 'In Transit' : 'Delivered';
          this.messageService.add({
            severity: 'success',
            summary: 'Status Updated',
            detail: `Allocation marked as ${label}.`,
          });
        },
        error: (err) => {
          this.statusUpdateLoading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Update Failed',
            detail: err?.error?.message ?? 'Failed to update allocation status',
          });
        },
      });
  }

  canDispatch(request: StockRequest): boolean {
    return request.status === 'PENDING';
  }

  canReject(request: StockRequest): boolean {
    return request.status === 'PENDING';
  }

  canMarkInTransit(request: StockRequest): boolean {
    return request.status === 'DISPATCHED';
  }

  canMarkDelivered(request: StockRequest): boolean {
    return request.status === 'IN_TRANSIT';
  }

  hasRowActions(request: StockRequest): boolean {
    return (
      this.canDispatch(request) ||
      this.canReject(request) ||
      this.canMarkInTransit(request) ||
      this.canMarkDelivered(request)
    );
  }

  getMerchantDisplay(request: StockRequest): string {
    return (
      request.merchant?.businessName ??
      request.merchantBusinessName ??
      request.merchantName ??
      request.receiverMerchant?.businessName ??
      request.merchantId
    );
  }

  getStatusLabel(status: AllocationStatus): string {
    return this.allocationService.getAllocationStatusLabel(status);
  }

  getStatusClass(status: AllocationStatus): string {
    const map: Record<AllocationStatus, string> = {
      PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
      DISPATCHED: 'bg-blue-50 text-blue-700 border-blue-200',
      IN_TRANSIT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      DELIVERED: 'bg-purple-50 text-purple-700 border-purple-200',
      RECEIVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      CANCELLED: 'bg-red-50 text-red-700 border-red-200',
    };
    return map[status] ?? 'bg-gray-50 text-gray-500 border-gray-200';
  }

  getSourceLabel(source: AllocationSource): string {
    return this.allocationService.getAllocationSourceLabel(source);
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
