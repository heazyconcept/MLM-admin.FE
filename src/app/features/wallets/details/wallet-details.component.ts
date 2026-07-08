import { Component, inject, computed, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { WalletService, Wallet, LedgerEntry } from '../services/wallet.service';
import { PermissionService } from '../../../core/services/permission.service';
import { Feature } from '../../../core/models/admin-permission.model';
import { InfoBannerComponent } from '../../../shared/components/info-banner/info-banner.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { TableColumn, TableConfig } from '../../../shared/components/data-table/data-table.types';
import { FundsAdjustmentModalComponent } from '../modals/funds-adjustment-modal.component';
import { WalletActionModalComponent } from '../modals/wallet-action-modal.component';
import { ConfirmationModalComponent, ConfirmationResult } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';

@Component({
  selector: 'app-wallet-details',
  imports: [CommonModule, RouterModule, InfoBannerComponent, DataTableComponent, FundsAdjustmentModalComponent, WalletActionModalComponent, ConfirmationModalComponent, ButtonModule, TagModule, ToastModule, StatusBadgeComponent, HasPermissionDirective],
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

  hasWalletActions = computed(() =>
    this.permission.hasAnyPermission('wallets.adjust_funds', 'users.lock_wallet')
  );
  isViewOnly = computed(
    () => this.permission.hasAccess(Feature.Wallets) && !this.hasWalletActions()
  );

  walletId = signal<string>(this.route.snapshot.paramMap.get('id') || '');
  
  wallet = signal<Wallet | null>(null);
  ledger = signal<LedgerEntry[]>([]);
  /** Stable list for Adjust Funds dropdown (updated when wallets load). */
  fundContextWallets = signal<Wallet[]>([]);

  /** Other wallets for the same user (excluding the current wallet). */
  siblingWallets = computed(() => {
    const current = this.wallet();
    if (!current) return [];
    return this.fundContextWallets().filter(w => w.id !== current.id);
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
    },
    {
      field: 'id',
      header: 'Actions',
      width: '100px',
      align: 'right',
    }
  ]);

  tableHeaders = computed(() => this.columns().map(c => c.header));

  // Modal state
  showAdjustmentModal = signal(false);
  showActionModal = signal(false);
  showUndoModal = signal(false);
  pendingUndoReference = signal('');
  undoLoading = signal(false);
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
        this.fundContextWallets.set([wallet]);
        this.loading.set(false);
        this.walletService.listWallets({ userId: wallet.userId, limit: 50 }).subscribe((wallets) => {
          const merged = wallets.some(w => w.id === wallet.id) ? wallets : [wallet, ...wallets];
          this.fundContextWallets.set(merged);
        });
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
    this.refreshWallet();
  }

  openUndo(entry: LedgerEntry): void {
    if (!entry.reference || !entry.canUndo) return;
    this.pendingUndoReference.set(entry.reference);
    this.showUndoModal.set(true);
  }

  onUndoConfirm(result: ConfirmationResult): void {
    if (!result.confirmed) {
      this.showUndoModal.set(false);
      return;
    }
    const reason = (result.reason ?? '').trim();
    if (reason.length < 10) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Reason required',
        detail: 'Please provide a reason of at least 10 characters.',
      });
      return;
    }

    const reference = this.pendingUndoReference();
    if (!reference) return;

    this.undoLoading.set(true);
    this.walletService.undoAdjustment(reference, { reason }).subscribe({
      next: (res) => {
        this.undoLoading.set(false);
        this.showUndoModal.set(false);
        this.pendingUndoReference.set('');
        this.messageService.add({
          severity: 'success',
          summary: 'Undo complete',
          detail: `${res.message} New balance: ${res.displayCurrency} ${res.balance.toLocaleString()}`,
        });
        this.refreshWallet();
      },
      error: (err) => {
        this.undoLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Undo failed',
          detail: err?.error?.message || 'Could not undo this adjustment.',
        });
      },
    });
  }

  onUndoCancel(): void {
    this.showUndoModal.set(false);
    this.pendingUndoReference.set('');
  }

  private refreshWallet(): void {
    const id = this.walletId();
    if (!id) return;
    this.walletService.getWalletById(id).subscribe({
      next: ({ wallet, ledger }) => {
        this.wallet.set(wallet);
        this.ledger.set(ledger);
        this.fundContextWallets.update((wallets) => {
          const idx = wallets.findIndex(w => w.id === wallet.id);
          if (idx === -1) return wallets;
          const next = [...wallets];
          next[idx] = wallet;
          return next;
        });
      },
    });
  }
}
