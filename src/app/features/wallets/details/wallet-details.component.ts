import { Component, inject, computed, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { WalletService, Wallet, LedgerEntry } from '../services/wallet.service';
import { PermissionService } from '../../../core/services/permission.service';
import { Feature, Action } from '../../../core/models/admin-permission.model';
import { InfoBannerComponent } from '../../../shared/components/info-banner/info-banner.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { TableColumn, TableConfig } from '../../../shared/components/data-table/data-table.types';
import { FundsAdjustmentModalComponent } from '../modals/funds-adjustment-modal.component';
import { WalletActionModalComponent } from '../modals/wallet-action-modal.component';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-wallet-details',
  imports: [CommonModule, RouterModule, InfoBannerComponent, DataTableComponent, FundsAdjustmentModalComponent, WalletActionModalComponent, ButtonModule, TagModule, ToastModule, StatusBadgeComponent],
  providers: [MessageService],
  templateUrl: './wallet-details.component.html',
  styleUrls: ['./wallet-details.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WalletDetailsComponent {
  private route = inject(ActivatedRoute);
  private walletService = inject(WalletService);
  private messageService = inject(MessageService);
  protected permission = inject(PermissionService);

  canPerformWalletActions = computed(
    () => this.permission.canEdit(Feature.Wallets) && this.permission.canPerform(Action.ManualWalletAdjustment)
  );
  isViewOnly = computed(() => !this.permission.canEdit(Feature.Wallets));

  walletId = signal<string>(this.route.snapshot.paramMap.get('id') || '');
  
  wallet = signal<Wallet | null>(null);
  ledger = signal<LedgerEntry[]>([]);

  /** Other wallets for the same user (excluding the current wallet). */
  siblingWallets = computed(() => {
    const current = this.wallet();
    if (!current) return [];
    const byUser = this.walletService.getWalletsByUserId(current.userId);
    return byUser.filter(w => w.id !== current.id);
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
      formatter: (value: unknown) => new Date(value as string | number | Date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  ]);

  tableHeaders = computed(() => this.columns().map(c => c.header));

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

  ngOnInit(): void {
    const id = this.walletId();
    if (!id) {
      return;
    }

    this.loading.set(true);
    this.walletService.getWalletById(id).subscribe({
      next: ({ wallet, ledger }) => {
        this.wallet.set(wallet);
        this.ledger.set(ledger);
        this.loading.set(false);
        // Load same user's wallets so siblingWallets has data
        this.walletService.listWallets({ userId: wallet.userId, limit: 50 }).subscribe();
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  /** Backend returns status as LOCKED, ACTIVE, FROZEN. */
  isLocked(w: Wallet): boolean {
    return (w.status ?? '').toUpperCase() === 'LOCKED';
  }

  isFrozen(w: Wallet): boolean {
    return (w.status ?? '').toUpperCase() === 'FROZEN';
  }

  toggleLock(w: Wallet) {
    this.pendingAction.set(this.isLocked(w) ? 'Unlock' : 'Lock');
    this.showActionModal.set(true);
  }

  confirmAction() {
    const w = this.wallet();
    if (!w) return;

    const action = this.pendingAction();
    const request$ = action === 'Unlock'
      ? this.walletService.unlockWallet(w.id)
      : this.walletService.lockWallet(w.id);

    request$.subscribe({
      next: (status) => {
        this.wallet.set({ ...w, status });
        this.showActionModal.set(false);
        this.messageService.add({
          severity: action === 'Unlock' ? 'success' : 'warn',
          summary: action === 'Unlock' ? 'Unlocked' : 'Locked',
          detail: `Wallet has been ${action === 'Unlock' ? 'unlocked' : 'locked'}.`
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Action failed',
          detail: 'Could not update wallet status. Please try again.'
        });
      }
    });
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
    const id = this.walletId();
    if (id) {
      this.walletService.getWalletById(id).subscribe({
        next: ({ wallet, ledger }) => {
          this.wallet.set(wallet);
          this.ledger.set(ledger);
        }
      });
    }
  }
}
