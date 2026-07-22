import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-admin-password-reset-result-modal',
  imports: [CommonModule, DialogModule, ButtonModule],
  templateUrl: './admin-password-reset-result-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPasswordResetResultModalComponent {
  visible = input<boolean>(false);
  fullName = input<string>('');
  temporaryPassword = input<string>('');

  closed = output<void>();

  onClose(): void {
    this.closed.emit();
  }
}
