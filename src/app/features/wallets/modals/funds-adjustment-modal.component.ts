import { Component, Input, Output, EventEmitter, inject, signal, Signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { Wallet, WalletService } from '../services/wallet.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-funds-adjustment-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, DialogModule, InputNumberModule],
  templateUrl: './funds-adjustment-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FundsAdjustmentModalComponent {
  private fb = inject(FormBuilder);
  private walletService = inject(WalletService);
  private messageService = inject(MessageService);

  @Input() visible = false;
  @Input({ required: true }) wallet!: Signal<Wallet | undefined>;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() adjusted = new EventEmitter<void>();

  type = signal<'Credit' | 'Debit'>('Credit');

  form = this.fb.group({
    amount: [null, [Validators.required, Validators.min(0.01)]],
    reason: ['', [Validators.required, Validators.minLength(5)]]
  });

  close() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.form.reset();
  }

  submit() {
    if (this.form.valid && this.wallet()) {
      const { amount, reason } = this.form.value;
      const w = this.wallet()!;
      
      if (amount && reason) {
        this.walletService.adjustFunds(w.id, this.type(), amount, reason);
        
        this.messageService.add({
          severity: 'success', 
          summary: 'Success', 
          detail: `Successfully ${this.type() === 'Credit' ? 'credited' : 'debited'} ${w.currency} ${amount}`
        });
        
        this.adjusted.emit();
        this.close();
      }
    }
  }
}
