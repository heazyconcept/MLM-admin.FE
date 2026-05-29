import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import {
  Announcement,
  AnnouncementsListFilters,
  AnnouncementsListResponse,
  BroadcastAnnouncementPayload,
  BroadcastAnnouncementResponse,
  CreateAnnouncementInput,
  CreateAnnouncementResponse,
} from './models/announcement.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private readonly api = inject(ApiService);

  private readonly announcementsState = signal<Announcement[]>([]);
  private readonly listTotalState = signal<number>(0);
  private readonly loadingState = signal<boolean>(false);
  private readonly loadingErrorState = signal<string | null>(null);

  readonly announcements = this.announcementsState.asReadonly();
  readonly listTotal = this.listTotalState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly loadingError = this.loadingErrorState.asReadonly();

  loadAnnouncements(filters?: AnnouncementsListFilters): Observable<AnnouncementsListResponse> {
    this.loadingState.set(true);
    this.loadingErrorState.set(null);

    const params: Record<string, unknown> = {
      limit: filters?.limit ?? 20,
      offset: filters?.offset ?? 0,
    };
    if (filters?.status) {
      params['status'] = filters.status;
    }

    return this.api.get<AnnouncementsListResponse>('admin/notifications/announcements', params).pipe(
      tap((res) => {
        this.announcementsState.set(res.announcements ?? []);
        this.listTotalState.set(res.total ?? res.announcements?.length ?? 0);
        this.loadingState.set(false);
      }),
      catchError((err) => {
        this.loadingState.set(false);
        this.loadingErrorState.set('Failed to load announcements.');
        return throwError(() => err);
      })
    );
  }

  getAnnouncement(id: string): Observable<Announcement> {
    return this.api.get<Announcement>(`admin/notifications/announcements/${encodeURIComponent(id)}`);
  }

  createAnnouncement(input: CreateAnnouncementInput): Observable<CreateAnnouncementResponse> {
    const formData = new FormData();
    formData.append('title', input.title);
    formData.append('message', input.message);
    formData.append('displayDays', String(input.displayDays));

    for (const role of input.targetRoles ?? []) {
      formData.append('targetRoles', role);
    }
    for (const pkg of input.targetPackages ?? []) {
      formData.append('targetPackages', pkg);
    }
    for (const file of input.images ?? []) {
      formData.append('images', file);
    }

    return this.api.post<CreateAnnouncementResponse>('admin/notifications/announcements', formData);
  }

  archiveAnnouncement(id: string): Observable<Announcement> {
    return this.api.patch<Announcement>(
      `admin/notifications/announcements/${encodeURIComponent(id)}/archive`
    );
  }

  broadcast(payload: BroadcastAnnouncementPayload): Observable<BroadcastAnnouncementResponse> {
    return this.api.post<BroadcastAnnouncementResponse>('admin/notifications/broadcast', payload);
  }
}
