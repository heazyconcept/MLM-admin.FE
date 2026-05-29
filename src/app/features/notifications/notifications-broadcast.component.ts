import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PermissionService } from '../../core/services/permission.service';
import { Feature } from '../../core/models/admin-permission.model';
import { InfoBannerComponent } from '../../shared/components/info-banner/info-banner.component';
import { NotificationsService } from './notifications.service';
import {
  ANNOUNCEMENT_TARGET_PACKAGES,
  ANNOUNCEMENT_TARGET_ROLES,
} from './models/announcement.model';

@Component({
  selector: 'app-notifications-broadcast',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    InputNumberModule,
    MultiSelectModule,
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
  private router = inject(Router);
  protected permission = inject(PermissionService);

  readonly roleOptions = [...ANNOUNCEMENT_TARGET_ROLES];
  readonly packageOptions = [...ANNOUNCEMENT_TARGET_PACKAGES];

  canBroadcast = computed(() => this.permission.canEdit(Feature.Notifications));
  isViewOnly = computed(() => !this.permission.canEdit(Feature.Notifications));

  title = signal('');
  message = signal('');
  displayDays = signal(7);
  targetRoles = signal<string[]>([]);
  targetPackages = signal<string[]>([]);
  sending = signal(false);
  confirmStep = signal(false);

  beginSend(): void {
    const t = this.title().trim();
    const m = this.message().trim();
    const days = this.displayDays();
    if (t.length < 3) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Title must be at least 3 characters.',
      });
      return;
    }
    if (m.length < 10) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Message must be at least 10 characters.',
      });
      return;
    }
    if (!Number.isFinite(days) || days < 1 || days > 365) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Display days must be between 1 and 365.',
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
        displayDays: this.displayDays(),
        targetRoles: this.targetRoles(),
        targetPackages: this.targetPackages(),
      })
      .subscribe({
        next: (res) => {
          this.sending.set(false);
          this.confirmStep.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Broadcast sent',
            detail: `Delivered to ${res.count} recipient(s).${res.announcementId ? ` Campaign ${res.announcementId}.` : ''}`,
          });
          this.title.set('');
          this.message.set('');
          this.targetRoles.set([]);
          this.targetPackages.set([]);
        },
        error: () => {
          this.sending.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Failed',
            detail: 'Broadcast could not be sent.',
          });
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/admin/notifications']);
  }
}
