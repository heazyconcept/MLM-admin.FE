import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';

/** POST /admin/notifications/broadcast */
export interface BroadcastAnnouncementPayload {
  title: string;
  message: string;
  targetAudience: string;
}

export interface BroadcastAnnouncementResponse {
  count: number;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private readonly api = inject(ApiService);

  broadcast(payload: BroadcastAnnouncementPayload): Observable<BroadcastAnnouncementResponse | null> {
    return this.api.post<BroadcastAnnouncementResponse>('admin/notifications/broadcast', payload).pipe(
      catchError(() => of(null))
    );
  }
}
