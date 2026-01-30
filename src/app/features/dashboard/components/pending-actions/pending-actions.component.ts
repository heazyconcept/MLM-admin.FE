import { Component, input, computed, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';

export interface PendingAction {
  type: 'withdrawals' | 'merchants' | 'payments' | 'compliance';
  label: string;
  count: number;
  icon: string;
  iconBg: string;
  iconColor: string;
  urgency: 'high' | 'medium' | 'low';
}

export interface PendingItem {
  id: string;
  name: string;
  amount?: string;
  date: string;
  status: string;
  type: string;
}

@Component({
  selector: 'app-pending-actions',
  imports: [CommonModule, RouterModule, DialogModule, TableModule, TagModule, ButtonModule],
  templateUrl: './pending-actions.component.html',
  styleUrls: ['./pending-actions.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PendingActionsComponent {
  actions = input<PendingAction[]>([]);
  private router = inject(Router);

  modalVisible = signal(false);
  selectedAction = signal<PendingAction | null>(null);
  modalItems = signal<PendingItem[]>([]);

  viewAll(type?: string) {
    this.modalVisible.set(false);
    const actionType = type || this.selectedAction()?.type;

    if (actionType === 'withdrawals') {
      this.router.navigate(['/admin/withdrawals/pending']);
    } else if (actionType === 'payments') {
      this.router.navigate(['/admin/payments'], { queryParams: { status: 'Failed' } });
    } else {
      // Fallback for other types
      this.router.navigate(['/admin', actionType]);
    }
  }

  get defaultActions(): PendingAction[] {
    return [
      {
        type: 'withdrawals',
        label: 'Pending Withdrawals',
        count: 24,
        icon: 'pi pi-wallet',
        iconBg: 'bg-mlm-warning/10',
        iconColor: 'text-mlm-warning',
        urgency: 'high'
      },
      {
        type: 'merchants',
        label: 'Merchant Approvals',
        count: 8,
        icon: 'pi pi-shop',
        iconBg: 'bg-mlm-blue-100',
        iconColor: 'text-mlm-blue-600',
        urgency: 'medium'
      },
      {
        type: 'payments',
        label: 'Failed Payments',
        count: 3,
        icon: 'pi pi-times-circle',
        iconBg: 'bg-mlm-error/10',
        iconColor: 'text-mlm-error',
        urgency: 'high'
      },
      {
        type: 'compliance',
        label: 'Compliance Alerts',
        count: 5,
        icon: 'pi pi-exclamation-triangle',
        iconBg: 'bg-mlm-warning/10',
        iconColor: 'text-mlm-warning',
        urgency: 'medium'
      }
    ];
  }

  displayActions = computed(() => {
    const a = this.actions();
    return a.length > 0 ? a : this.defaultActions;
  });

  openModal(action: PendingAction) {
    this.selectedAction.set(action);
    this.modalItems.set(this.getMockItems(action.type));
    this.modalVisible.set(true);
  }

  getMockItems(type: string): PendingItem[] {
    const mockData: Record<string, PendingItem[]> = {
      withdrawals: [
        { id: 'W001', name: 'John Doe', amount: '$2,500.00', date: '2026-01-14', status: 'Pending', type: 'Bank Transfer' },
        { id: 'W002', name: 'Jane Smith', amount: '$1,800.00', date: '2026-01-14', status: 'Pending', type: 'USDT' },
        { id: 'W003', name: 'Mike Johnson', amount: '$3,200.00', date: '2026-01-13', status: 'Review', type: 'Bank Transfer' }
      ],
      merchants: [
        { id: 'M001', name: 'ABC Store', amount: '', date: '2026-01-14', status: 'Pending', type: 'Regional' },
        { id: 'M002', name: 'XYZ Market', amount: '', date: '2026-01-13', status: 'Pending', type: 'National' }
      ],
      payments: [
        { id: 'P001', name: 'Transaction #4521', amount: '$500.00', date: '2026-01-14', status: 'Failed', type: 'Insufficient Funds' },
        { id: 'P002', name: 'Transaction #4518', amount: '$750.00', date: '2026-01-13', status: 'Failed', type: 'Card Declined' }
      ],
      compliance: [
        { id: 'C001', name: 'Unusual Activity', amount: '', date: '2026-01-14', status: 'Review', type: 'High Volume' },
        { id: 'C002', name: 'KYC Incomplete', amount: '', date: '2026-01-13', status: 'Pending', type: 'Documentation' }
      ]
    };
    return mockData[type] || [];
  }

  getUrgencyClass(urgency: string): string {
    const classes: Record<string, string> = {
      high: 'bg-mlm-error text-white',
      medium: 'bg-mlm-warning text-white',
      low: 'bg-mlm-secondary text-white'
    };
    return classes[urgency] || classes['low'];
  }

  getStatusSeverity(status: string): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" {
    const severities: Record<string, "success" | "info" | "warn" | "danger" | "secondary" | "contrast"> = {
      'Pending': 'warn',
      'Review': 'info',
      'Failed': 'danger',
      'Approved': 'success'
    };
    return severities[status] || 'info';
  }
}

