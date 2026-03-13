import { Component, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { WithdrawalService } from '../services/withdrawal.service';
import { PermissionService } from '../../../core/services/permission.service';
import { Feature, Action } from '../../../core/models/admin-permission.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { InfoBannerComponent } from '../../../shared/components/info-banner/info-banner.component';
import { WithdrawalActionModalComponent, ActionType } from '../modals/withdrawal-action-modal.component';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-withdrawal-details',
  imports: [
    CommonModule,
    RouterModule,
    StatusBadgeComponent,
    InfoBannerComponent,
    WithdrawalActionModalComponent,
    ButtonModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './withdrawal-details.component.html',
  styleUrl: './withdrawal-details.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WithdrawalDetailsComponent {
  private route = inject(ActivatedRoute);
  private withdrawalService = inject(WithdrawalService);
  private messageService = inject(MessageService);
  protected permission = inject(PermissionService);

  canPerformWithdrawalActions = computed(
    () => this.permission.canEdit(Feature.Withdrawals) && this.permission.canPerform(Action.ApproveWithdrawal)
  );
  isViewOnly = computed(() => !this.permission.canEdit(Feature.Withdrawals));

  withdrawalId = signal<string | null>(this.route.snapshot.paramMap.get('id'));

  withdrawal = computed(() => {
    return this.withdrawalService.getWithdrawalById(this.withdrawalId());
  });

  statusHistory = computed(() => {
    const id = this.withdrawalId();
    return id ? this.withdrawalService.getStatusHistory(id) : [];
  });

  // Action states
  showConfirmModal = signal(false);
  pendingAction = signal<ActionType | null>(null);

  canApprove = computed(() => this.withdrawal()?.status === 'Pending');
  canReject = computed(() => 
    this.withdrawal()?.status === 'Pending'
  );
  canMarkPaid = computed(() => this.withdrawal()?.status === 'Approved');

  onApprove() {
    this.openModal('Approve');
  }

  onReject() {
    this.openModal('Reject');
  }

  onMarkPaid() {
    this.openModal('MarkPaid');
  }

  private openModal(action: ActionType) {
    this.pendingAction.set(action);
    this.showConfirmModal.set(true);
  }

  handleActionConfirmed(event: { action: ActionType, reason?: string, payoutReference?: string }) {
    const w = this.withdrawal();
    if (!w) return;

    switch (event.action) {
      case 'Approve':
        this.withdrawalService.approveWithdrawal(w.id).subscribe({
          next: () => this.showToast('success', 'Approved', 'Withdrawal request has been approved'),
          error: (error) => this.showToast('error', 'Error', error?.error?.message ?? 'Failed to approve withdrawal')
        });
        break;
      case 'Reject':
        this.withdrawalService.rejectWithdrawal(w.id, event.reason || 'Rejected by Admin').subscribe({
          next: () => this.showToast('error', 'Rejected', 'Withdrawal request has been rejected'),
          error: (error) => this.showToast('error', 'Error', error?.error?.message ?? 'Failed to reject withdrawal')
        });
        break;
      case 'MarkPaid':
        this.withdrawalService.markPaid(w.id, event.payoutReference || `ADMIN-${w.id}-${Date.now()}`).subscribe({
          next: () => this.showToast('success', 'Paid', 'Withdrawal marked as paid'),
          error: (error) => this.showToast('error', 'Error', error?.error?.message ?? 'Failed to mark withdrawal as paid')
        });
        break;
    }

    this.showConfirmModal.set(false);
    this.pendingAction.set(null);
  }

  handleActionCancelled() {
    this.showConfirmModal.set(false);
    this.pendingAction.set(null);
  }

  private showToast(severity: string, summary: string, detail: string) {
    this.messageService.add({ severity, summary, detail });
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'Paid': return 'success';
      case 'Approved': return 'info';
      case 'Pending': return 'warn';
      case 'Rejected': return 'danger';
      case 'Processing': return 'secondary';
      default: return 'info';
    }
  }
}

