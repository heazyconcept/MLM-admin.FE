import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface WalletSummaryData {
  type: string;
  label: string;
  balance: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-wallet-summary',
  imports: [CommonModule],
  templateUrl: './wallet-summary.component.html',
  styleUrls: ['./wallet-summary.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WalletSummaryComponent {
  wallets = input<WalletSummaryData[]>([]);
  totalBalance = input('$0.00');
}

