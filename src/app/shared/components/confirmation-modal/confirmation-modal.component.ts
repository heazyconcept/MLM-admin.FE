import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

export interface ConfirmationResult {
  confirmed: boolean;
  reason?: string;
}

@Component({
  selector: 'app-confirmation-modal',
  imports: [CommonModule, ReactiveFormsModule, DialogModule, ButtonModule],
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

  reasonControl = new FormControl('');

  onConfirm(): void {
    if (this.showReasonField() && this.reasonRequired() && !(this.reasonControl.value || '').trim()) {
      return;
    }
    this.confirm.emit({ confirmed: true, reason: this.reasonControl.value || '' });
    this.close();
  }

  onCancel(): void {
    this.cancel.emit();
    this.close();
  }

  close(): void {
    this.reasonControl.reset('');
    this.visibleChange.emit(false);
  }
}

