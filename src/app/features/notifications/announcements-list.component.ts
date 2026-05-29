import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { TablePageEvent } from 'primeng/table';
import { PermissionService } from '../../core/services/permission.service';
import { Feature } from '../../core/models/admin-permission.model';
import { InfoBannerComponent } from '../../shared/components/info-banner/info-banner.component';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { NotificationsService } from './notifications.service';
import {
  Announcement,
  AnnouncementStatus,
} from './models/announcement.model';

interface StatusFilterOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-announcements-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    ButtonModule,
    ToastModule,
    DialogModule,
    InfoBannerComponent,
    DataTableComponent,
    StatusBadgeComponent,
  ],
  providers: [MessageService],
  templateUrl: './announcements-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementsListComponent implements OnInit {
  private readonly notifications = inject(NotificationsService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly permission = inject(PermissionService);

  announcements = this.notifications.announcements;
  loading = this.notifications.loading;
  loadingError = this.notifications.loadingError;
  listTotal = this.notifications.listTotal;

  canEdit = computed(() => this.permission.canEdit(Feature.Notifications));
  isViewOnly = computed(() => !this.permission.canEdit(Feature.Notifications));

  selectedStatusControl = new FormControl<string>('all');
  offset = signal(0);
  readonly pageSize = 20;

  archiveTarget = signal<Announcement | null>(null);
  archiveDialogVisible = signal(false);
  archiving = signal(false);

  statusOptions: StatusFilterOption[] = [
    { label: 'All statuses', value: 'all' },
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Published', value: 'PUBLISHED' },
    { label: 'Archived', value: 'ARCHIVED' },
  ];

  tableHeaders = signal<string[]>([
    'Title',
    'Status',
    'Published',
    'Ends',
    'Recipients',
    'Images',
    'Actions',
  ]);

  ngOnInit(): void {
    this.loadList();

    this.selectedStatusControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.offset.set(0);
        this.loadList();
      });
  }

  loadList(): void {
    const status = this.selectedStatusControl.value;
    this.notifications
      .loadAnnouncements({
        limit: this.pageSize,
        offset: this.offset(),
        ...(status && status !== 'all' ? { status: status as AnnouncementStatus } : {}),
      })
      .subscribe({
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Load failed',
            detail: 'Could not load announcement campaigns.',
          });
        },
      });
  }

  onPageChange(event: TablePageEvent): void {
    this.offset.set(event.first ?? 0);
    this.loadList();
  }

  goToCreate(): void {
    this.router.navigate(['/admin/notifications/create']);
  }

  goToBroadcast(): void {
    this.router.navigate(['/admin/notifications/broadcast']);
  }

  openArchiveConfirm(announcement: Announcement): void {
    this.archiveTarget.set(announcement);
    this.archiveDialogVisible.set(true);
  }

  closeArchiveConfirm(): void {
    if (!this.archiving()) {
      this.archiveDialogVisible.set(false);
      this.archiveTarget.set(null);
    }
  }

  confirmArchive(): void {
    const target = this.archiveTarget();
    if (!target || !this.canEdit()) return;

    this.archiving.set(true);
    this.notifications.archiveAnnouncement(target.id).subscribe({
      next: () => {
        this.archiving.set(false);
        this.archiveDialogVisible.set(false);
        this.archiveTarget.set(null);
        this.messageService.add({
          severity: 'success',
          summary: 'Archived',
          detail: `"${target.title}" will no longer show as a dashboard popup.`,
        });
        this.loadList();
      },
      error: () => {
        this.archiving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Archive failed',
          detail: 'Could not archive this campaign.',
        });
      },
    });
  }

  formatDate(value: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleString();
  }

  getDisplayStatus(status: AnnouncementStatus): string {
    switch (status) {
      case 'PUBLISHED':
        return 'Active';
      case 'ARCHIVED':
        return 'Archived';
      case 'DRAFT':
      default:
        return 'Pending';
    }
  }

  canArchive(row: Announcement): boolean {
    return this.canEdit() && row.status === 'PUBLISHED';
  }
}
