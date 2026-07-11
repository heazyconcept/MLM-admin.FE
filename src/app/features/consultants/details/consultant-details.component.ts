import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import {
  ConsultantService,
  BusinessConsultant
} from '../services/consultant.service';
import { PermissionService } from '../../../core/services/permission.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { InfoBannerComponent } from '../../../shared/components/info-banner/info-banner.component';
import { ConfirmationModalComponent, ConfirmationResult } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { ConsultantRejectModalComponent } from '../modals/consultant-reject-modal.component';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';

@Component({
  selector: 'app-consultant-details',
  imports: [
    CommonModule,
    RouterModule,
    StatusBadgeComponent,
    InfoBannerComponent,
    ConfirmationModalComponent,
    ConsultantRejectModalComponent,
    ButtonModule,
    ToastModule,
    HasPermissionDirective
  ],
  providers: [MessageService],
  templateUrl: './consultant-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConsultantDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private consultantService = inject(ConsultantService);
  private messageService = inject(MessageService);
  protected permission = inject(PermissionService);

  consultant = signal<BusinessConsultant | null>(null);
  loading = signal(false);
  actionLoading = signal(false);

  showRejectModal = signal(false);
  showConfirmModal = signal(false);
  confirmAction = signal<'approve' | 'revoke' | null>(null);

  canApprove = computed(() => this.permission.hasPermission('consultants.approve'));
  isViewOnly = computed(() => !this.canApprove());

  statusDisplay = computed(() => {
    const c = this.consultant();
    if (!c) return '';
    return this.consultantService.getDisplayStatus(c.status);
  });

  applicantName = computed(() => {
    const c = this.consultant();
    if (!c) return '—';
    return this.consultantService.getApplicantDisplayName(c);
  });

  isPending = computed(() => this.consultant()?.status === 'PENDING');
  isApproved = computed(() => this.consultant()?.status === 'APPROVED');

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
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) this.loadConsultant(id);
    });
  }

  private loadConsultant(id: string): void {
    this.loading.set(true);
    this.consultantService.loadConsultant(id).subscribe({
      next: (c) => {
        this.consultant.set(c);
        this.loading.set(false);
      },
      error: () => {
        this.consultant.set(null);
        this.loading.set(false);
      }
    });
  }

  onApproveClick(): void {
    this.confirmAction.set('approve');
    this.showConfirmModal.set(true);
  }

  onRejectClick(): void {
    this.showRejectModal.set(true);
  }

  onRevokeClick(): void {
    this.confirmAction.set('revoke');
    this.showConfirmModal.set(true);
  }

  handleConfirm(result: ConfirmationResult): void {
    if (!result.confirmed) return;
    const c = this.consultant();
    const action = this.confirmAction();
    if (!c || !action) return;

    this.actionLoading.set(true);
    this.showConfirmModal.set(false);

    const request$ = action === 'approve'
      ? this.consultantService.approveConsultant(c.id)
      : this.consultantService.revokeConsultant(c.id);

    request$.subscribe({
      next: (updated) => {
        this.consultant.set(updated);
        this.messageService.add({
          severity: 'success',
          summary: action === 'approve' ? 'Application Approved' : 'Consultant Revoked',
          detail: action === 'approve'
            ? 'The user is now an active business consultant.'
            : 'Consultant status has been revoked.'
        });
        this.actionLoading.set(false);
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
    const c = this.consultant();
    if (!c) return;

    this.actionLoading.set(true);
    this.showRejectModal.set(false);

    this.consultantService.rejectConsultant(c.id, reason).subscribe({
      next: (updated) => {
        this.consultant.set(updated);
        this.messageService.add({
          severity: 'success',
          summary: 'Application Rejected',
          detail: 'The applicant has been notified and may re-apply.'
        });
        this.actionLoading.set(false);
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

  goToUser(): void {
    const userId = this.consultant()?.userId;
    if (userId) this.router.navigate(['/admin/users', userId]);
  }
}
