import { Component, input, output, model, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-legacy-waive-join-modal',
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, TextareaModule],
  templateUrl: './legacy-waive-join-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegacyWaiveJoinModalComponent {
  visible = model(false);
  userName = input('');
  packageLabel = input('');
  submitting = input(false);

  confirmed = output<string>();
  cancelled = output<void>();

  reason = '';

  onConfirm(): void {
    if (this.reason.trim().length < 10) return;
    this.confirmed.emit(this.reason.trim());
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  resetForm(): void {
    this.reason = '';
  }
}
