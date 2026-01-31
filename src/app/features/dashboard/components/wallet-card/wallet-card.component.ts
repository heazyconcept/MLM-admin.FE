import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface WalletData {
  currency: string;
  symbol: string;
  amount: string;
  flag: string;
  status: 'Active' | 'Inactive';
}

@Component({
  selector: 'app-wallet-card',
  imports: [CommonModule],
  templateUrl: './wallet-card.component.html',
  styleUrls: ['./wallet-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WalletCardComponent {
  wallet = input.required<WalletData>();

  statusClass = computed(() => {
    return this.wallet().status === 'Active' 
      ? 'text-mlm-success' 
      : 'text-mlm-secondary';
  });
}

