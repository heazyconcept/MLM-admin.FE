import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';

/** GET /admin/settings — SystemSettingsResponseDto */
export interface SystemSettingRow {
  key: string;
  value: unknown;
  version?: number;
  description?: string;
  updatedAt?: string;
}

export interface SystemSettingsResponse {
  settings: SystemSettingRow[];
}

/** PUT /admin/settings body */
export interface SystemSettingsUpdatePayload {
  settings: Array<{ key: string; value: unknown }>;
}

@Injectable({
  providedIn: 'root',
})
export class AdminSettingsService {
  private readonly api = inject(ApiService);

  getSettings(): Observable<SystemSettingsResponse | null> {
    return this.api.get<SystemSettingsResponse>('admin/settings').pipe(
      catchError(() => of(null))
    );
  }

  updateSettings(payload: SystemSettingsUpdatePayload): Observable<SystemSettingsResponse | null> {
    return this.api.put<SystemSettingsResponse>('admin/settings', payload).pipe(
      catchError(() => of(null))
    );
  }
}
