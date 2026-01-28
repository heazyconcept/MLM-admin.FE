import { Component, Input } from '@angular/core';
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
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wallet-summary.component.html',
  styleUrls: ['./wallet-summary.component.css']
})
export class WalletSummaryComponent {
  @Input() wallets: WalletSummaryData[] = [];
  @Input() totalBalance = '$0.00';
}

