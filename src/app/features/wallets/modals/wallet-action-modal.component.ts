import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Wallet } from '../services/wallet.service';

@Component({
  selector: 'app-wallet-action-modal',
  imports: [CommonModule, ButtonModule, DialogModule],
  templateUrl: './wallet-action-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WalletActionModalComponent {
  visible = input<boolean>(false);
  wallet = input.required<Wallet | undefined>();
  action = input.required<'Lock' | 'Unlock'>();
  
  visibleChange = output<boolean>();
  confirmed = output<void>();

  close() {
    this.visibleChange.emit(false);
  }

  confirm() {
    this.confirmed.emit();
    this.close();
  }
}
