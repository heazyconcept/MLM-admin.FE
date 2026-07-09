import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import {
  ManualDepositService,
  ManualWalletDeposit,
  ManualDepositWalletType
} from '../services/manual-deposit.service';
import { PermissionService } from '../../../core/services/permission.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { InfoBannerComponent } from '../../../shared/components/info-banner/info-banner.component';
import { ManualPaymentRejectModalComponent } from '../modals/manual-payment-reject-modal.component';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';

const WALLET_TYPE_LABELS: Record<ManualDepositWalletType, string> = {
  REGISTRATION: 'Registration wallet',
  VOUCHER: 'Product Voucher wallet'
};

@Component({
  selector: 'app-manual-deposit-detail',
  imports: [
    CommonModule,
    RouterModule,
    StatusBadgeComponent,
    InfoBannerComponent,
    ManualPaymentRejectModalComponent,
    ButtonModule,
    ToastModule,
    HasPermissionDirective
  ],
  providers: [MessageService],
  templateUrl: './manual-deposit-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManualDepositDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private manualDepositService = inject(ManualDepositService);
  private messageService = inject(MessageService);
  protected permission = inject(PermissionService);

  canApproveReject = computed(() =>
    this.permission.hasPermission('payments.mark_successful')
  );

  isViewOnly = computed(() => !this.canApproveReject());

  deposit = signal<ManualWalletDeposit | null>(null);
  loading = signal(false);
  actionLoading = signal(false);

  showRejectModal = signal(false);

  statusDisplay = computed(() => {
    const d = this.deposit();
    if (!d) return '';
    const map: Record<string, string> = {
      PENDING: 'Pending',
      APPROVED: 'Approved',
      REJECTED: 'Rejected'
    };
    return map[d.status] ?? d.status;
  });

  isPending = computed(() => this.deposit()?.status === 'PENDING');

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.loadDeposit(id);
      }
    });
  }

  private loadDeposit(id: string): void {
    this.loading.set(true);
    this.manualDepositService.getById(id).subscribe({
      next: (deposit) => {
        this.deposit.set(deposit);
        this.loading.set(false);
      },
      error: () => {
        this.deposit.set(null);
        this.loading.set(false);
      }
    });
  }

  onApprove(): void {
    const d = this.deposit();
    if (!d) return;

    this.actionLoading.set(true);
    this.manualDepositService.approve(d.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Deposit Approved',
          detail: `The ${this.formatWalletType(d.walletType)} has been credited.`
        });
        this.actionLoading.set(false);
        this.loadDeposit(d.id);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        const detail = err?.error?.message ?? err?.message ?? 'Failed to approve deposit';
        this.messageService.add({ severity: 'error', summary: 'Approval Failed', detail });
        this.actionLoading.set(false);
      }
    });
  }

  onRejectClick(): void {
    this.showRejectModal.set(true);
  }

  handleRejectConfirmed(reason: string): void {
    const d = this.deposit();
    if (!d) return;

    this.actionLoading.set(true);
    this.showRejectModal.set(false);

    this.manualDepositService.reject(d.id, reason).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Deposit Rejected',
          detail: 'The submission has been rejected. The user can submit again.'
        });
        this.actionLoading.set(false);
        this.loadDeposit(d.id);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        const detail = err?.error?.message ?? err?.message ?? 'Failed to reject deposit';
        this.messageService.add({ severity: 'error', summary: 'Rejection Failed', detail });
        this.actionLoading.set(false);
      }
    });
  }

  handleRejectCancelled(): void {
    this.showRejectModal.set(false);
  }

  formatWalletType(walletType: string): string {
    const normalized = walletType?.toUpperCase() as ManualDepositWalletType;
    return WALLET_TYPE_LABELS[normalized] ?? walletType;
  }

  isImageUrl(url: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png')
      || lower.endsWith('.gif') || lower.endsWith('.webp')
      || lower.includes('/image') || lower.includes('image/');
  }
}
