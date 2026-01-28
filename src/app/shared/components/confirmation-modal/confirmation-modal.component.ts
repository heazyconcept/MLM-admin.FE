import { Component, EventEmitter, Input, Output } from '@angular/core';
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
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule],
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.css']
})
export class ConfirmationModalComponent {
  @Input() visible = false;
  @Input() title = 'Confirm Action';
  @Input() message = 'Are you sure you want to proceed?';
  @Input() icon = 'pi pi-exclamation-triangle';
  @Input() iconClass = 'text-mlm-warning';
  @Input() confirmLabel = 'Confirm';
  @Input() cancelLabel = 'Cancel';
  @Input() confirmClass = 'p-button-primary';
  @Input() showReasonField = false;
  @Input() reasonRequired = false;
  @Input() reasonPlaceholder = 'Enter reason...';

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirm = new EventEmitter<ConfirmationResult>();
  @Output() cancel = new EventEmitter<void>();

  reason = '';

  onConfirm(): void {
    if (this.showReasonField && this.reasonRequired && !this.reason.trim()) {
      return;
    }
    this.confirm.emit({ confirmed: true, reason: this.reason });
    this.close();
  }

  onCancel(): void {
    this.cancel.emit();
    this.close();
  }

  close(): void {
    this.reason = '';
    this.visible = false;
    this.visibleChange.emit(false);
  }
}

