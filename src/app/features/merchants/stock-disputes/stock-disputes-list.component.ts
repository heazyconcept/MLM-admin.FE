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
  MerchantAllocationService,
  StockDispute,
  DisputeStatus,
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
  selector: 'app-stock-disputes-list',
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
  templateUrl: './stock-disputes-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockDisputesListComponent implements OnInit {
  private allocationService = inject(MerchantAllocationService);
  private messageService = inject(MessageService);

  disputes = this.allocationService.disputes;
  totalRecords = this.allocationService.disputesTotal;
  tableLoading = this.allocationService.loading;

  rowsPerPage = signal(10);
  firstRecord = signal(0);
  selectedStatusControl = new FormControl('all');
  merchantIdFilter = signal('');

  showEvidenceModal = signal(false);
  showRejectModal = signal(false);
  showAcceptModal = signal(false);
  selectedDispute = signal<StockDispute | null>(null);
  actionLoading = signal(false);

  statusOptions: StatusOption[] = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Open', value: 'OPEN' },
    { label: 'Admin Rejected', value: 'ADMIN_REJECTED' },
    { label: 'Admin Accepted', value: 'ADMIN_ACCEPTED' },
    { label: 'Merchant Acknowledged', value: 'MERCHANT_ACKNOWLEDGED' },
    { label: 'Closed', value: 'CLOSED' },
  ];

  tableHeaders = signal([
    'Merchant',
    'Product',
    'Dispatched',
    'Claimed',
    'Status',
    'Opened',
    'Actions',
  ]);

  stats = computed(() => {
    const all = this.disputes();
    return {
      open: all.filter((d) => d.status === 'OPEN').length,
      rejected: all.filter((d) => d.status === 'ADMIN_REJECTED').length,
      accepted: all.filter((d) => d.status === 'ADMIN_ACCEPTED').length,
    };
  });

  ngOnInit(): void {
    this.loadDisputes();
  }

  loadDisputes(): void {
    const status = this.selectedStatusControl.value;
    const merchantId = this.merchantIdFilter().trim();

    this.allocationService
      .getStockDisputes({
        status: status && status !== 'all' ? (status as DisputeStatus) : undefined,
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

  onViewEvidence(dispute: StockDispute): void {
    this.selectedDispute.set(dispute);
    this.showEvidenceModal.set(true);
  }

  onReject(dispute: StockDispute): void {
    this.selectedDispute.set(dispute);
    this.showRejectModal.set(true);
  }

  onAccept(dispute: StockDispute): void {
    this.selectedDispute.set(dispute);
    this.showAcceptModal.set(true);
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
    this.allocationService.rejectDispute(dispute.id, adminNotes).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.showRejectModal.set(false);
        this.selectedDispute.set(null);
        this.loadDisputes();
        this.messageService.add({
          severity: 'success',
          summary: 'Dispute Rejected',
          detail: 'The merchant will be notified to acknowledge the rejection.',
        });
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Reject Failed',
          detail: err?.error?.message ?? 'Failed to reject dispute',
        });
      },
    });
  }

  handleAcceptConfirm(event: { confirmed: boolean; reason?: string }): void {
    const dispute = this.selectedDispute();
    if (!event.confirmed || !dispute) {
      this.showAcceptModal.set(false);
      return;
    }

    this.actionLoading.set(true);
    this.allocationService
      .acceptDispute(dispute.id, (event.reason ?? '').trim() || undefined)
      .subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.showAcceptModal.set(false);
          this.selectedDispute.set(null);
          this.loadDisputes();
          this.messageService.add({
            severity: 'success',
            summary: 'Dispute Accepted',
            detail: 'Claimed quantity credited. Remainder allocation created if needed.',
          });
        },
        error: (err) => {
          this.actionLoading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Accept Failed',
            detail: err?.error?.message ?? 'Failed to accept dispute',
          });
        },
      });
  }

  closeEvidenceModal(): void {
    this.showEvidenceModal.set(false);
    this.selectedDispute.set(null);
  }

  getMerchantDisplay(dispute: StockDispute): string {
    return dispute.merchantBusinessName ?? dispute.merchantName ?? dispute.merchantId;
  }

  getDisputeStatusLabel(status: DisputeStatus): string {
    return this.allocationService.getDisputeStatusLabel(status);
  }

  getDisputeStatusClass(status: DisputeStatus): string {
    const map: Record<DisputeStatus, string> = {
      OPEN: 'bg-red-50 text-red-700 border-red-200',
      ADMIN_REJECTED: 'bg-amber-50 text-amber-700 border-amber-200',
      ADMIN_ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      MERCHANT_ACKNOWLEDGED: 'bg-blue-50 text-blue-700 border-blue-200',
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

  canResolve(dispute: StockDispute): boolean {
    return dispute.status === 'OPEN';
  }
}
