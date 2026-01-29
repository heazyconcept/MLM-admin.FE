import { Component, Input, Output, EventEmitter, Signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Wallet } from '../services/wallet.service';

@Component({
  selector: 'app-wallet-action-modal',
  standalone: true,
  imports: [CommonModule, ButtonModule, DialogModule],
  templateUrl: './wallet-action-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WalletActionModalComponent {
  @Input() visible = false;
  @Input({ required: true }) wallet!: Signal<Wallet | undefined>;
  @Input() action!: Signal<'Lock' | 'Unlock'>;
  
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirmed = new EventEmitter<void>();

  close() {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  confirm() {
    this.confirmed.emit();
    this.close();
  }
}
