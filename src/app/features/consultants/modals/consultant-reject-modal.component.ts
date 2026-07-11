import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { BusinessConsultant } from '../services/consultant.service';

@Component({
  selector: 'app-consultant-reject-modal',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    TextareaModule
  ],
  templateUrl: './consultant-reject-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConsultantRejectModalComponent {
  visible = input<boolean>(false);
  consultant = input<BusinessConsultant | null>(null);

  confirmed = output<string>();
  cancelled = output<void>();

  reasonControl = new FormControl('', [Validators.required, Validators.minLength(5)]);

  get confirmDisabled(): boolean {
    return this.reasonControl.invalid || (this.reasonControl.value || '').trim().length < 5;
  }

  onConfirm(): void {
    if (this.confirmDisabled) return;
    this.confirmed.emit((this.reasonControl.value || '').trim());
    this.reset();
  }

  onCancel(): void {
    this.cancelled.emit();
    this.reset();
  }

  private reset(): void {
    this.reasonControl.reset('');
  }
}
