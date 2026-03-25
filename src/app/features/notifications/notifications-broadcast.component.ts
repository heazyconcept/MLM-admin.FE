import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PermissionService } from '../../core/services/permission.service';
import { Feature } from '../../core/models/admin-permission.model';
import { InfoBannerComponent } from '../../shared/components/info-banner/info-banner.component';
import { NotificationsService } from './notifications.service';

@Component({
  selector: 'app-notifications-broadcast',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    ToastModule,
    InfoBannerComponent,
  ],
  providers: [MessageService],
  templateUrl: './notifications-broadcast.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsBroadcastComponent {
  private notifications = inject(NotificationsService);
  private messageService = inject(MessageService);
  protected permission = inject(PermissionService);

  canBroadcast = computed(() => this.permission.canEdit(Feature.Notifications));
  isViewOnly = computed(() => !this.permission.canEdit(Feature.Notifications));

  title = signal('');
  message = signal('');
  targetAudience = signal('ALL');
  sending = signal(false);
  confirmStep = signal(false);

  beginSend(): void {
    const t = this.title().trim();
    const m = this.message().trim();
    if (!t || !m) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Missing fields',
        detail: 'Title and message are required.',
      });
      return;
    }
    this.confirmStep.set(true);
  }

  cancelConfirm(): void {
    this.confirmStep.set(false);
  }

  submit(): void {
    if (!this.canBroadcast()) return;
    this.sending.set(true);
    this.notifications
      .broadcast({
        title: this.title().trim(),
        message: this.message().trim(),
        targetAudience: this.targetAudience(),
      })
      .subscribe({
        next: (res) => {
          this.sending.set(false);
          this.confirmStep.set(false);
          if (res === null) {
            this.messageService.add({
              severity: 'error',
              summary: 'Failed',
              detail: 'Broadcast could not be sent.',
            });
            return;
          }
          this.messageService.add({
            severity: 'success',
            summary: 'Broadcast sent',
            detail: `Delivered to ${res.count} recipient(s).`,
          });
          this.title.set('');
          this.message.set('');
        },
        error: () => {
          this.sending.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Request failed.',
          });
        },
      });
  }
}
