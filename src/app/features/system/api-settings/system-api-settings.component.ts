import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PermissionService } from '../../../core/services/permission.service';
import { Feature, Action } from '../../../core/models/admin-permission.model';
import { InfoBannerComponent } from '../../../shared/components/info-banner/info-banner.component';
import {
  AdminSettingsService,
  SystemSettingRow,
} from '../services/admin-settings.service';

@Component({
  selector: 'app-system-api-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TextareaModule,
    ToastModule,
    InfoBannerComponent,
  ],
  providers: [MessageService],
  templateUrl: './system-api-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemApiSettingsComponent implements OnInit {
  private adminSettings = inject(AdminSettingsService);
  private messageService = inject(MessageService);
  protected permission = inject(PermissionService);

  canEdit = computed(
    () =>
      this.permission.canEdit(Feature.SystemConfig) &&
      this.permission.canPerform(Action.ChangeSystemConfig)
  );
  isViewOnly = computed(() => !this.permission.canEdit(Feature.SystemConfig));

  loading = signal(false);
  saving = signal(false);
  loadError = signal<string | null>(null);

  /** Editable copy: key -> stringified value for textarea */
  rows = signal<SystemSettingRow[]>([]);
  valueDraft = signal<Record<string, string>>({});
  initialSnapshot = signal<Record<string, string>>({});

  dirtyKeys = computed(() => {
    const draft = this.valueDraft();
    const snap = this.initialSnapshot();
    const keys = new Set([...Object.keys(draft), ...Object.keys(snap)]);
    const dirty: string[] = [];
    keys.forEach((k) => {
      if ((draft[k] ?? '') !== (snap[k] ?? '')) dirty.push(k);
    });
    return dirty;
  });
  hasChanges = computed(() => this.dirtyKeys().length > 0);

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.adminSettings.getSettings().subscribe({
      next: (res) => {
        this.loading.set(false);
        if (!res?.settings?.length) {
          if (res === null) {
            this.loadError.set('Failed to load system settings.');
          }
          this.rows.set(res?.settings ?? []);
          this.valueDraft.set({});
          this.initialSnapshot.set({});
          return;
        }
        this.rows.set(res.settings);
        const draft: Record<string, string> = {};
        const snap: Record<string, string> = {};
        for (const s of res.settings) {
          const str = this.stringifyValue(s.value);
          draft[s.key] = str;
          snap[s.key] = str;
        }
        this.valueDraft.set(draft);
        this.initialSnapshot.set(snap);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('Failed to load system settings.');
      },
    });
  }

  onValueChange(key: string, text: string): void {
    this.valueDraft.update((d) => ({ ...d, [key]: text }));
  }

  save(): void {
    if (!this.canEdit() || !this.hasChanges()) return;
    const dirty = this.dirtyKeys();
    const payload = {
      settings: dirty.map((key) => ({
        key,
        value: this.parseValue(this.valueDraft()[key] ?? ''),
      })),
    };
    this.saving.set(true);
    this.adminSettings.updateSettings(payload).subscribe({
      next: (res) => {
        this.saving.set(false);
        if (!res?.settings) {
          this.messageService.add({
            severity: 'error',
            summary: 'Save failed',
            detail: 'Could not update settings.',
          });
          return;
        }
        this.rows.set(res.settings);
        const snap: Record<string, string> = {};
        for (const s of res.settings) {
          snap[s.key] = this.stringifyValue(s.value);
        }
        this.valueDraft.set(snap);
        this.initialSnapshot.set({ ...snap });
        this.messageService.add({
          severity: 'success',
          summary: 'Saved',
          detail: 'System settings updated.',
        });
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to save settings.',
        });
      },
    });
  }

  private stringifyValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  private parseValue(text: string): unknown {
    const t = text.trim();
    if (t === '') return '';
    if (t === 'true') return true;
    if (t === 'false') return false;
    if (!Number.isNaN(Number(t)) && t !== '' && /^-?\d+(\.\d+)?$/.test(t)) {
      return Number(t);
    }
    try {
      return JSON.parse(t) as unknown;
    } catch {
      return text;
    }
  }
}
