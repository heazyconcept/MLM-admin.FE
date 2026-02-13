import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import type { AuditLogEntry } from './audit-logs.component';

export interface SnapshotRow {
  field: string;
  before: string;
  after: string;
  changed: boolean;
}

function formatSnapshotValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function humanizeField(key: string): string {
  const withSpaces = key.replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ').trim();
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1).toLowerCase();
}

@Component({
  selector: 'app-audit-detail-drawer',
  standalone: true,
  imports: [CommonModule, DrawerModule, ButtonModule],
  templateUrl: './audit-detail-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditDetailDrawerComponent {
  visible = input.required<boolean>();
  entry = input<AuditLogEntry | null>(null);
  visibleChange = output<void>();

  showRawJson = signal(false);

  timestampFormatted = computed(() => {
    const e = this.entry();
    if (!e?.timestamp) return '—';
    return new Date(e.timestamp).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    });
  });

  snapshotRows = computed(() => {
    const e = this.entry();
    const before = e?.beforeSnapshot ?? {};
    const after = e?.afterSnapshot ?? {};
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    if (keys.size === 0) return [];
    return Array.from(keys).map((key) => {
      const beforeVal = formatSnapshotValue((before as Record<string, unknown>)[key]);
      const afterVal = formatSnapshotValue((after as Record<string, unknown>)[key]);
      return {
        field: humanizeField(key),
        before: beforeVal,
        after: afterVal,
        changed: beforeVal !== afterVal,
      } as SnapshotRow;
    });
  });

  beforeJson = computed(() => {
    const e = this.entry();
    if (!e?.beforeSnapshot) return null;
    return JSON.stringify(e.beforeSnapshot, null, 2);
  });

  afterJson = computed(() => {
    const e = this.entry();
    if (!e?.afterSnapshot) return null;
    return JSON.stringify(e.afterSnapshot, null, 2);
  });

  relatedList = computed(() => {
    const e = this.entry();
    return e?.relatedEntities ?? [];
  });

  onHide(): void {
    this.visibleChange.emit();
  }
}
