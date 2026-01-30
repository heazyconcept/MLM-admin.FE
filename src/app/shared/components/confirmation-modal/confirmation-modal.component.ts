import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

export interface ConfirmationResult {
  confirmed: boolean;
  reason?: string;
}

@Component({
  selector: 'app-confirmation-modal',
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule],
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmationModalComponent {
  visible = input<boolean>(false);
  title = input<string>('Confirm Action');
  message = input<string>('Are you sure you want to proceed?');
  icon = input<string>('pi pi-exclamation-triangle');
  iconClass = input<string>('text-mlm-warning');
  confirmLabel = input<string>('Confirm');
  cancelLabel = input<string>('Cancel');
  confirmClass = input<string>('p-button-primary');
  showReasonField = input<boolean>(false);
  reasonRequired = input<boolean>(false);
  reasonPlaceholder = input<string>('Enter reason...');

  visibleChange = output<boolean>();
  confirm = output<ConfirmationResult>();
  cancel = output<void>();

  reason = signal('');

  onConfirm(): void {
    if (this.showReasonField() && this.reasonRequired() && !this.reason().trim()) {
      return;
    }
    this.confirm.emit({ confirmed: true, reason: this.reason() });
    this.close();
  }

  onCancel(): void {
    this.cancel.emit();
    this.close();
  }

  close(): void {
    this.reason.set('');
    this.visibleChange.emit(false);
  }
}

