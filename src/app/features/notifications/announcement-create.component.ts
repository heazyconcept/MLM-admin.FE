import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
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
  ANNOUNCEMENT_IMAGE_ACCEPT,
  ANNOUNCEMENT_MAX_IMAGE_BYTES,
  ANNOUNCEMENT_MAX_IMAGES,
  ANNOUNCEMENT_TARGET_PACKAGES,
  ANNOUNCEMENT_TARGET_ROLES,
} from './models/announcement.model';

interface ImagePreview {
  file: File;
  url: string;
}

@Component({
  selector: 'app-announcement-create',
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
  templateUrl: './announcement-create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementCreateComponent {
  private readonly notifications = inject(NotificationsService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  protected readonly permission = inject(PermissionService);

  readonly roleOptions = [...ANNOUNCEMENT_TARGET_ROLES];
  readonly packageOptions = [...ANNOUNCEMENT_TARGET_PACKAGES];
  readonly imageAccept = ANNOUNCEMENT_IMAGE_ACCEPT;
  readonly maxImages = ANNOUNCEMENT_MAX_IMAGES;

  canCreate = computed(() => this.permission.canEdit(Feature.Notifications));
  isViewOnly = computed(() => !this.permission.canEdit(Feature.Notifications));

  title = signal('');
  message = signal('');
  displayDays = signal(7);
  targetRoles = signal<string[]>([]);
  targetPackages = signal<string[]>([]);
  imagePreviews = signal<ImagePreview[]>([]);
  submitting = signal(false);
  confirmStep = signal(false);

  beginSubmit(): void {
    const validationError = this.validate();
    if (validationError) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: validationError,
      });
      return;
    }
    this.confirmStep.set(true);
  }

  cancelConfirm(): void {
    this.confirmStep.set(false);
  }

  submit(): void {
    if (!this.canCreate()) return;

    const validationError = this.validate();
    if (validationError) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: validationError,
      });
      return;
    }

    this.submitting.set(true);
    const previews = this.imagePreviews();

    this.notifications
      .createAnnouncement({
        title: this.title().trim(),
        message: this.message().trim(),
        displayDays: this.displayDays(),
        targetRoles: this.targetRoles(),
        targetPackages: this.targetPackages(),
        images: previews.map((p) => p.file),
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.confirmStep.set(false);
          this.revokePreviews(previews);
          this.messageService.add({
            severity: 'success',
            summary: 'Campaign published',
            detail: `Delivered to ${res.recipientCount} recipient(s).`,
          });
          this.router.navigate(['/admin/notifications']);
        },
        error: () => {
          this.submitting.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Create failed',
            detail: 'Could not publish the campaign. Check image size/type and try again.',
          });
        },
      });
  }

  onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';

    if (!files.length) return;

    const current = this.imagePreviews();
    const remaining = this.maxImages - current.length;
    if (remaining <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Too many images',
        detail: `Maximum ${this.maxImages} images allowed.`,
      });
      return;
    }

    const accepted: ImagePreview[] = [];
    for (const file of files.slice(0, remaining)) {
      if (!ANNOUNCEMENT_IMAGE_ACCEPT.split(',').includes(file.type)) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Invalid file',
          detail: `${file.name}: use JPEG, PNG, or WebP.`,
        });
        continue;
      }
      if (file.size > ANNOUNCEMENT_MAX_IMAGE_BYTES) {
        this.messageService.add({
          severity: 'warn',
          summary: 'File too large',
          detail: `${file.name} exceeds 5 MB.`,
        });
        continue;
      }
      accepted.push({ file, url: URL.createObjectURL(file) });
    }

    if (files.length > remaining) {
      this.messageService.add({
        severity: 'info',
        summary: 'Limit reached',
        detail: `Only ${remaining} more image(s) added (max ${this.maxImages}).`,
      });
    }

    this.imagePreviews.set([...current, ...accepted]);
  }

  removeImage(index: number): void {
    const previews = [...this.imagePreviews()];
    const [removed] = previews.splice(index, 1);
    if (removed) URL.revokeObjectURL(removed.url);
    this.imagePreviews.set(previews);
  }

  goBack(): void {
    this.revokePreviews(this.imagePreviews());
    this.router.navigate(['/admin/notifications']);
  }

  private validate(): string | null {
    const title = this.title().trim();
    const message = this.message().trim();
    const days = this.displayDays();

    if (title.length < 3) return 'Title must be at least 3 characters.';
    if (message.length < 10) return 'Message must be at least 10 characters.';
    if (!Number.isFinite(days) || days < 1 || days > 365) {
      return 'Display days must be between 1 and 365.';
    }
    return null;
  }

  private revokePreviews(previews: ImagePreview[]): void {
    for (const preview of previews) {
      URL.revokeObjectURL(preview.url);
    }
  }
}
