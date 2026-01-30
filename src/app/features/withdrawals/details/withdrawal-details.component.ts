import { Component, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { WithdrawalService, WithdrawalRequest, StatusHistory } from '../services/withdrawal.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
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
    this.withdrawal()?.status === 'Pending' || 
    this.withdrawal()?.status === 'Approved'
  );
  canMarkProcessing = computed(() => this.withdrawal()?.status === 'Approved');
  canMarkPaid = computed(() => this.withdrawal()?.status === 'Processing');

  onApprove() {
    this.openModal('Approve');
  }

  onReject() {
    this.openModal('Reject');
  }

  onMarkProcessing() {
    this.openModal('MarkProcessing');
  }

  onMarkPaid() {
    this.openModal('MarkPaid');
  }

  private openModal(action: ActionType) {
    this.pendingAction.set(action);
    this.showConfirmModal.set(true);
  }

  handleActionConfirmed(event: { action: ActionType, reason?: string }) {
    const w = this.withdrawal();
    if (!w) return;

    switch (event.action) {
      case 'Approve':
        this.withdrawalService.approveWithdrawal(w.id);
        this.showToast('success', 'Approved', 'Withdrawal request has been approved');
        break;
      case 'Reject':
        this.withdrawalService.rejectWithdrawal(w.id, event.reason || 'Rejected by Admin');
        this.showToast('error', 'Rejected', 'Withdrawal request has been rejected');
        break;
      case 'MarkProcessing':
        this.withdrawalService.updateStatus(w.id, 'Processing');
        this.showToast('info', 'Processing', 'Withdrawal marked as processing');
        break;
      case 'MarkPaid':
        this.withdrawalService.updateStatus(w.id, 'Paid');
        this.showToast('success', 'Paid', 'Withdrawal marked as paid');
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

