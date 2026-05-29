import { Component, input, output, model, ChangeDetectionStrategy, inject, signal, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { WalletService, Wallet, LedgerEntry } from '../../wallets/services/wallet.service';

@Component({
  selector: 'app-wallet-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    TextareaModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './wallet-detail-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletDetailDialogComponent implements OnInit, OnChanges {
  private readonly walletService = inject(WalletService);
  private readonly messageService = inject(MessageService);

  visible = model(false);
  walletId = input('');
  walletLabel = input('');

  closed = output<void>();

  wallet = signal<Wallet | null>(null);
  ledger = signal<LedgerEntry[]>([]);
  loading = signal(false);

  showAdjust = signal(false);
  adjustAmount: number | null = null;
  adjustReason = '';
  adjusting = signal(false);

  ngOnInit(): void {
    this.loadWallet();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && changes['visible'].currentValue === true) {
      this.loadWallet();
    }
  }

  loadWallet(): void {
    const id = this.walletId();
    if (!id) return;
    this.loading.set(true);
    this.walletService.getWalletById(id).subscribe({
      next: (res) => {
        this.wallet.set(res.wallet);
        this.ledger.set(res.ledger);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not load wallet details.',
        });
      },
    });
  }

  onHide(): void {
    this.showAdjust.set(false);
    this.closed.emit();
  }

  openAdjust(): void {
    this.showAdjust.set(true);
    this.adjustAmount = null;
    this.adjustReason = '';
  }

  cancelAdjust(): void {
    this.showAdjust.set(false);
  }

  confirmAdjust(): void {
    const id = this.walletId();
    if (!id || !this.adjustAmount || this.adjustReason.trim().length < 10) return;

    this.adjusting.set(true);
    this.walletService.adjustWallet(id, {
      amount: this.adjustAmount,
      reason: this.adjustReason.trim(),
    }).subscribe({
      next: (balance) => {
        this.adjusting.set(false);
        this.showAdjust.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Adjusted',
          detail: `New balance: ${balance}`,
        });
        this.loadWallet();
      },
      error: () => {
        this.adjusting.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Adjust failed',
          detail: 'Could not adjust wallet balance.',
        });
      },
    });
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  formatBalance(balance: number, currency?: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'NGN',
      minimumFractionDigits: 2,
    }).format(balance);
  }

  getStatusSeverity(status: string): string {
    return status === 'ACTIVE' ? 'success' : 'danger';
  }
}
