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
import { OrderDisputeService } from '../services/order-dispute.service';
import { OrderDispute, OrderDisputeStatus } from '../../../core/models/order.model';
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
  selector: 'app-order-disputes-list',
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
  templateUrl: './order-disputes-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDisputesListComponent implements OnInit {
  private disputeService = inject(OrderDisputeService);
  private messageService = inject(MessageService);

  disputes = this.disputeService.disputes;
  totalRecords = this.disputeService.disputesTotal;
  tableLoading = this.disputeService.loading;

  rowsPerPage = signal(10);
  firstRecord = signal(0);
  selectedStatusControl = new FormControl('all');
  merchantIdFilter = signal('');

  showEvidenceModal = signal(false);
  showFavorMerchantModal = signal(false);
  showFavorCustomerModal = signal(false);
  selectedDispute = signal<OrderDispute | null>(null);
  actionLoading = signal(false);

  statusOptions: StatusOption[] = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Open', value: 'OPEN' },
    { label: 'Resolved', value: 'RESOLVED' },
    { label: 'Closed', value: 'CLOSED' },
  ];

  tableHeaders = signal([
    'Order',
    'Customer',
    'Merchant',
    'Reason',
    'Status',
    'Opened',
    'Actions',
  ]);

  stats = computed(() => {
    const all = this.disputes();
    return {
      open: all.filter((d) => d.status === 'OPEN').length,
      resolved: all.filter((d) => d.status === 'RESOLVED').length,
      total: all.length,
    };
  });

  ngOnInit(): void {
    this.loadDisputes();
  }

  loadDisputes(): void {
    const status = this.selectedStatusControl.value;
    const merchantId = this.merchantIdFilter().trim();

    this.disputeService
      .getDisputes({
        status: status && status !== 'all' ? (status as OrderDisputeStatus) : undefined,
        merchantId: merchantId || undefined,
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

  onViewEvidence(dispute: OrderDispute): void {
    this.selectedDispute.set(dispute);
    this.showEvidenceModal.set(true);
  }

  onFavorMerchant(dispute: OrderDispute): void {
    this.selectedDispute.set(dispute);
    this.showFavorMerchantModal.set(true);
  }

  onFavorCustomer(dispute: OrderDispute): void {
    this.selectedDispute.set(dispute);
    this.showFavorCustomerModal.set(true);
  }

  handleFavorMerchantConfirm(event: { confirmed: boolean; reason?: string }): void {
    this.resolveDispute('MERCHANT', 'COMPLETE_ORDER', event);
  }

  handleFavorCustomerConfirm(event: { confirmed: boolean; reason?: string }): void {
    this.resolveDispute('CUSTOMER', 'CANCEL_ORDER', event);
  }

  private resolveDispute(
    outcome: 'MERCHANT' | 'CUSTOMER',
    resolution: string,
    event: { confirmed: boolean; reason?: string }
  ): void {
    const dispute = this.selectedDispute();
    if (!event.confirmed || !dispute) {
      this.showFavorMerchantModal.set(false);
      this.showFavorCustomerModal.set(false);
      return;
    }

    this.actionLoading.set(true);
    this.disputeService
      .resolveDispute(dispute.id, {
        outcome,
        resolution,
        adminNotes: (event.reason ?? '').trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.showFavorMerchantModal.set(false);
          this.showFavorCustomerModal.set(false);
          this.selectedDispute.set(null);
          this.loadDisputes();
          const summary =
            outcome === 'MERCHANT'
              ? 'Order marked as completed.'
              : 'Order cancelled. Handle refund offline.';
          this.messageService.add({
            severity: 'success',
            summary: 'Dispute Resolved',
            detail: summary,
          });
        },
        error: (err) => {
          this.actionLoading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Resolve Failed',
            detail: err?.error?.message ?? 'Failed to resolve dispute',
          });
        },
      });
  }

  closeEvidenceModal(): void {
    this.showEvidenceModal.set(false);
    this.selectedDispute.set(null);
  }

  getCustomerDisplay(dispute: OrderDispute): string {
    return dispute.customerName ?? 'Customer';
  }

  getMerchantDisplay(dispute: OrderDispute): string {
    return dispute.merchantName ?? dispute.merchantId ?? '—';
  }

  getDisputeStatusLabel(status: OrderDisputeStatus): string {
    return this.disputeService.getDisputeStatusLabel(status);
  }

  getDisputeStatusClass(status: OrderDisputeStatus): string {
    const map: Record<OrderDisputeStatus, string> = {
      OPEN: 'bg-red-50 text-red-700 border-red-200',
      RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      CLOSED: 'bg-gray-50 text-gray-500 border-gray-200',
    };
    return map[status] ?? 'bg-gray-50 text-gray-500 border-gray-200';
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

  isImageUrl(url: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
  }

  canResolve(dispute: OrderDispute): boolean {
    return dispute.status === 'OPEN';
  }
}
