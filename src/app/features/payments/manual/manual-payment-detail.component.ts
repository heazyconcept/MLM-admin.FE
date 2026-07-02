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
  ManualPaymentService,
  ManualRegistrationPayment
} from '../services/manual-payment.service';
import { PermissionService } from '../../../core/services/permission.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { InfoBannerComponent } from '../../../shared/components/info-banner/info-banner.component';
import { ManualPaymentRejectModalComponent } from '../modals/manual-payment-reject-modal.component';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';

@Component({
  selector: 'app-manual-payment-detail',
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
  templateUrl: './manual-payment-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManualPaymentDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private manualPaymentService = inject(ManualPaymentService);
  private messageService = inject(MessageService);
  protected permission = inject(PermissionService);

  canApproveReject = computed(() =>
    this.permission.hasPermission('payments.mark_successful')
  );

  isViewOnly = computed(() => !this.canApproveReject());

  payment = signal<ManualRegistrationPayment | null>(null);
  loading = signal(false);
  actionLoading = signal(false);

  showRejectModal = signal(false);

  statusDisplay = computed(() => {
    const p = this.payment();
    if (!p) return '';
    const map: Record<string, string> = {
      PENDING: 'Pending',
      APPROVED: 'Approved',
      REJECTED: 'Rejected'
    };
    return map[p.status] ?? p.status;
  });

  isPending = computed(() => this.payment()?.status === 'PENDING');

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.loadPayment(id);
      }
    });
  }

  private loadPayment(id: string): void {
    this.loading.set(true);
    this.manualPaymentService.getById(id).subscribe({
      next: (payment) => {
        this.payment.set(payment);
        this.loading.set(false);
      },
      error: () => {
        this.payment.set(null);
        this.loading.set(false);
      }
    });
  }

  onApprove(): void {
    const p = this.payment();
    if (!p) return;

    this.actionLoading.set(true);
    this.manualPaymentService.approve(p.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Payment Approved',
          detail: 'The registration payment has been approved. User account is now activated.'
        });
        this.actionLoading.set(false);
        this.loadPayment(p.id);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        const detail = err?.error?.message ?? err?.message ?? 'Failed to approve payment';
        this.messageService.add({ severity: 'error', summary: 'Approval Failed', detail });
        this.actionLoading.set(false);
      }
    });
  }

  onRejectClick(): void {
    this.showRejectModal.set(true);
  }

  handleRejectConfirmed(reason: string): void {
    const p = this.payment();
    if (!p) return;

    this.actionLoading.set(true);
    this.showRejectModal.set(false);

    this.manualPaymentService.reject(p.id, reason).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Payment Rejected',
          detail: 'The submission has been rejected. The user can submit again.'
        });
        this.actionLoading.set(false);
        this.loadPayment(p.id);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        const detail = err?.error?.message ?? err?.message ?? 'Failed to reject payment';
        this.messageService.add({ severity: 'error', summary: 'Rejection Failed', detail });
        this.actionLoading.set(false);
      }
    });
  }

  handleRejectCancelled(): void {
    this.showRejectModal.set(false);
  }

  formatPackage(packageId: string): string {
    if (!packageId) return '—';
    return packageId
      .split(/[_\s]+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  isImageUrl(url: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png')
      || lower.endsWith('.gif') || lower.endsWith('.webp')
      || lower.includes('/image') || lower.includes('image/');
  }
}
