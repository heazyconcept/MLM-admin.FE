import { Component, Input } from '@angular/core';
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
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wallet-card.component.html',
  styleUrls: ['./wallet-card.component.css']
})
export class WalletCardComponent {
  @Input() wallet!: WalletData;

  get statusClass(): string {
    return this.wallet.status === 'Active' 
      ? 'text-mlm-success' 
      : 'text-mlm-secondary';
  }
}

