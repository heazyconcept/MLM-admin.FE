import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import type { AuditLogEntry } from './audit-logs.component';

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

  timestampFormatted = computed(() => {
    const e = this.entry();
    if (!e?.timestamp) return '—';
    return new Date(e.timestamp).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'medium',
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
