import { Component, input, output, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-temporary-transaction-pin-result-modal',
  imports: [CommonModule, DialogModule, ButtonModule],
  templateUrl: './temporary-transaction-pin-result-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemporaryTransactionPinResultModalComponent {
  visible = input<boolean>(false);
  username = input<string>('');
  fullName = input<string>('');
  temporaryPin = input<string>('');
  expiresAt = input<string>('');

  expiresLabel = computed(() => {
    const raw = this.expiresAt();
    if (!raw) return '';
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? raw : date.toLocaleString();
  });

  closed = output<void>();

  onClose(): void {
    this.closed.emit();
  }
}
