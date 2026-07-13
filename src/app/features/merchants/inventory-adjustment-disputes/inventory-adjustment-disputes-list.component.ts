import {
  Component,
  inject,
  computed,
  signal,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { ConfirmationModalComponent } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import {
  InventoryAdjustmentDisputeService,
  InventoryAdjustmentDispute,
  InventoryAdjustmentDisputeStatus,
  AdjustmentType,
} from '../services/inventory-adjustment-dispute.service';
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
  selector: 'app-inventory-adjustment-disputes-list',
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
  templateUrl: './inventory-adjustment-disputes-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryAdjustmentDisputesListComponent implements OnInit {
  private disputeService = inject(InventoryAdjustmentDisputeService);
  private messageService = inject(MessageService);

  disputes = this.disputeService.disputes;
  totalRecords = this.disputeService.disputesTotal;
  tableLoading = this.disputeService.loading;

  rowsPerPage = signal(10);
  firstRecord = signal(0);
  selectedStatusControl = new FormControl('all');
  merchantIdFilter = signal('');
  productIdFilter = signal('');

  showDetailModal = signal(false);
  showApproveModal = signal(false);
  showRejectModal = signal(false);
  selectedDispute = signal<InventoryAdjustmentDispute | null>(null);
  detailLoading = signal(false);
  actionLoading = signal(false);

  statusOptions: StatusOption[] = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Open', value: 'OPEN' },
    { label: 'Admin Approved', value: 'ADMIN_APPROVED' },
    { label: 'Admin Rejected', value: 'ADMIN_REJECTED' },
    { label: 'Closed', value: 'CLOSED' },
  ];

  tableHeaders = signal([
    'Merchant',
    'Product',
    'Authorized',
    'Requested',
    'Type',
    'Status',
    'Opened',
    'Actions',
  ]);

  stats = computed(() => {
    const all = this.disputes();
    return {
      open: all.filter((d) => d.status === 'OPEN').length,
      approved: all.filter((d) => d.status === 'ADMIN_APPROVED').length,
      rejected: all.filter((d) => d.status === 'ADMIN_REJECTED').length,
    };
  });

  ngOnInit(): void {
    this.loadDisputes();
  }

  loadDisputes(): void {
    const status = this.selectedStatusControl.value;
    const merchantId = this.merchantIdFilter().trim();
    const productId = this.productIdFilter().trim();

    this.disputeService
      .loadFromApi({
        status: status && status !== 'all' ? (status as InventoryAdjustmentDisputeStatus) : undefined,
        merchantId: merchantId || undefined,
        productId: productId || undefined,
        limit: this.rowsPerPage(),
        offset: this.firstRecord(),
      })
      .subscribe();
  }

  onSearch(): void {
    this.firstRecord.set(0);
    this.loadDisputes();
  }

  onPageChange(event: TablePageEvent): void {
    this.firstRecord.set(event.first ?? 0);
    this.rowsPerPage.set(event.rows ?? 10);
    this.loadDisputes();
  }

  onViewDetails(dispute: InventoryAdjustmentDispute): void {
    this.selectedDispute.set(dispute);
    this.showDetailModal.set(true);
    this.detailLoading.set(true);
    this.disputeService.getById(dispute.id).subscribe({
      next: (detail) => {
        this.selectedDispute.set(detail);
        this.detailLoading.set(false);
      },
      error: () => {
        this.detailLoading.set(false);
      },
    });
  }

  onApprove(dispute: InventoryAdjustmentDispute): void {
    this.selectedDispute.set(dispute);
    this.showApproveModal.set(true);
  }

  onReject(dispute: InventoryAdjustmentDispute): void {
    this.selectedDispute.set(dispute);
    this.showRejectModal.set(true);
  }

  handleApproveConfirm(event: { confirmed: boolean; reason?: string }): void {
    const dispute = this.selectedDispute();
    if (!event.confirmed || !dispute) {
      this.showApproveModal.set(false);
      return;
    }

    const adminNotes = (event.reason ?? '').trim() || undefined;

    this.actionLoading.set(true);
    this.disputeService.approve(dispute.id, adminNotes).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.showApproveModal.set(false);
        this.showDetailModal.set(false);
        this.selectedDispute.set(null);
        this.loadDisputes();
        this.messageService.add({
          severity: 'success',
          summary: 'Dispute Approved',
          detail: 'Merchant stock quantity has been updated to the requested amount.',
        });
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Approval Failed',
          detail: err?.error?.message ?? 'Failed to approve dispute',
        });
      },
    });
  }

  handleRejectConfirm(event: { confirmed: boolean; reason?: string }): void {
    const dispute = this.selectedDispute();
    if (!event.confirmed || !dispute) {
      this.showRejectModal.set(false);
      return;
    }

    const adminNotes = (event.reason ?? '').trim();
    if (!adminNotes) return;

    this.actionLoading.set(true);
    this.disputeService.reject(dispute.id, adminNotes).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.showRejectModal.set(false);
        this.showDetailModal.set(false);
        this.selectedDispute.set(null);
        this.loadDisputes();
        this.messageService.add({
          severity: 'success',
          summary: 'Dispute Rejected',
          detail: 'The merchant has been notified. Stock quantity remains unchanged.',
        });
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Rejection Failed',
          detail: err?.error?.message ?? 'Failed to reject dispute',
        });
      },
    });
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedDispute.set(null);
  }

  getMerchantDisplay(dispute: InventoryAdjustmentDispute): string {
    return (
      dispute.merchantUsername ??
      dispute.merchantName ??
      dispute.merchantBusinessName ??
      dispute.merchantId
    );
  }

  getProductDisplay(dispute: InventoryAdjustmentDispute): string {
    const name = dispute.productName ?? dispute.productId;
    return dispute.productSku ? `${name} (${dispute.productSku})` : name;
  }

  getStatusLabel(status: InventoryAdjustmentDisputeStatus): string {
    return this.disputeService.getStatusLabel(status);
  }

  getStatusClass(status: InventoryAdjustmentDisputeStatus): string {
    const map: Record<InventoryAdjustmentDisputeStatus, string> = {
      OPEN: 'bg-red-50 text-red-700 border-red-200',
      ADMIN_APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      ADMIN_REJECTED: 'bg-amber-50 text-amber-700 border-amber-200',
      CLOSED: 'bg-gray-50 text-gray-500 border-gray-200',
    };
    return map[status] ?? 'bg-gray-50 text-gray-500 border-gray-200';
  }

  getAdjustmentTypeClass(type: AdjustmentType): string {
    return type === 'INCREASE'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-red-50 text-red-700 border-red-200';
  }

  getRequestedQtyClass(dispute: InventoryAdjustmentDispute): string {
    return dispute.adjustmentType === 'INCREASE' ? 'text-emerald-600' : 'text-red-600';
  }

  getQuantityDelta(dispute: InventoryAdjustmentDispute): number {
    return dispute.requestedQuantity - dispute.authorizedQuantity;
  }

  formatDelta(dispute: InventoryAdjustmentDispute): string {
    const delta = this.getQuantityDelta(dispute);
    return delta > 0 ? `+${delta}` : String(delta);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  canResolve(dispute: InventoryAdjustmentDispute): boolean {
    return dispute.status === 'OPEN';
  }
}
