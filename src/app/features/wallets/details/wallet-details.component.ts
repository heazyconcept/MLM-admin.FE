import { Component, inject, computed, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { WalletService, Wallet, LedgerEntry } from '../services/wallet.service';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { DataTableTemplateDirective } from '../../../shared/components/data-table/data-table-template.directive';
import { TableColumn, TableConfig } from '../../../shared/components/data-table/data-table.types';
import { FundsAdjustmentModalComponent } from '../modals/funds-adjustment-modal.component';
import { WalletActionModalComponent } from '../modals/wallet-action-modal.component';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-wallet-details',
  imports: [CommonModule, RouterModule, DataTableComponent, DataTableTemplateDirective, FundsAdjustmentModalComponent, WalletActionModalComponent, ButtonModule, TagModule, ToastModule],
  providers: [MessageService],
  templateUrl: './wallet-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WalletDetailsComponent {
  private route = inject(ActivatedRoute);
  private walletService = inject(WalletService);
  private messageService = inject(MessageService);

  walletId = signal<string>(this.route.snapshot.paramMap.get('id') || '');
  
  wallet = computed(() => {
    const id = this.walletId();
    return this.walletService.getWallet(id)();
  });

  ledger = computed(() => {
    const id = this.walletId();
    return this.walletService.getWalletLedger(id)();
  });

  loading = signal(false);
  columns = signal<TableColumn<LedgerEntry>[]>([
    {
      field: 'id',
      header: 'Details',
      width: '200px'
    },
    {
      field: 'reason',
      header: 'Reason'
    },
    {
      field: 'amount',
      header: 'Amount'
    },
    {
      field: 'timestamp',
      header: 'Date',
      width: '200px',
      align: 'right',
      formatter: (value) => new Date(value).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  ]);

  // Modal state
  showAdjustmentModal = signal(false);
  showActionModal = signal(false);
  pendingAction = signal<'Lock' | 'Unlock'>('Lock');

  tableConfig = signal<TableConfig>({
    paginator: false,
    globalFilter: false,
    showGridlines: false,
    hoverable: true,
    size: 'normal'
  });

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (status) {
        case 'Active': return 'success';
        case 'Locked': return 'danger';
        case 'Frozen': return 'warn';
        default: return 'info';
    }
  }

  toggleLock(w: Wallet) {
    this.pendingAction.set(w.status === 'Locked' ? 'Unlock' : 'Lock');
    this.showActionModal.set(true);
  }

  confirmAction() {
    const w = this.wallet();
    if (!w) return;
    
    if (this.pendingAction() === 'Unlock') {
      this.walletService.unlockWallet(w.id);
      this.messageService.add({severity:'success', summary:'Unlocked', detail:'Wallet has been unlocked.'});
    } else {
      this.walletService.lockWallet(w.id);
      this.messageService.add({severity:'warn', summary:'Locked', detail:'Wallet has been locked.'});
    }
  }

  openAdjustment() {
    this.showAdjustmentModal.set(true);
  }

  onAdjustmentComplete() {
    this.messageService.add({
      severity: 'success',
      summary: 'Adjustment Complete',
      detail: 'Wallet balance has been updated'
    });
  }
}
