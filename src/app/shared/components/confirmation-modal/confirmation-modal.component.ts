import { Component, input, output, ChangeDetectionStrategy, signal, effect, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  private readonly destroyRef = inject(DestroyRef);

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
  reasonMinLength = input<number>(0);
  reasonPlaceholder = input<string>('Enter reason...');
  confirmDisabled = input<boolean>(false);
  loading = input<boolean>(false);

  visibleChange = output<boolean>();
  confirm = output<ConfirmationResult>();
  cancel = output<void>();

  reasonControl = new FormControl('');
  reasonTrimmedLength = signal(0);

  constructor() {
    this.reasonControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.reasonTrimmedLength.set((value || '').trim().length);
    });

    effect(() => {
      if (!this.visible()) {
        this.reasonControl.reset('', { emitEvent: false });
        this.reasonTrimmedLength.set(0);
      }
    });
  }

  isReasonInvalid(): boolean {
    if (!this.showReasonField() || !this.reasonRequired()) return false;
    const length = this.reasonTrimmedLength();
    const min = this.reasonMinLength();
    if (min > 0) return length < min;
    return length === 0;
  }

  onConfirm(): void {
    if (this.isReasonInvalid()) {
      return;
    }
    this.confirm.emit({ confirmed: true, reason: this.reasonControl.value || '' });
    // Defer close so parents can set [loading]=true synchronously in the confirm handler.
    queueMicrotask(() => {
      if (!this.loading()) {
        this.close();
      }
    });
  }

  onCancel(): void {
    this.cancel.emit();
    this.close();
  }

  close(): void {
    this.reasonControl.reset('');
    this.reasonTrimmedLength.set(0);
    this.visibleChange.emit(false);
  }
}
