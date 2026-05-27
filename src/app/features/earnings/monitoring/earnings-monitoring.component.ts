import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import {
  EarningsService,
  EarningsMetricsResponse,
  UserEarningsActivityItem,
  formatUserEarningsActivityAmount,
  userEarningsActivityTrackId,
} from '../services/earnings.service';
import { getEarningTypeLabel } from '../../../core/constants/earning-type-labels';

@Component({
  selector: 'app-earnings-monitoring',
  imports: [CommonModule, TagModule, ButtonModule, ProgressBarModule],
  templateUrl: './earnings-monitoring.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EarningsMonitoringComponent implements OnInit {
  private readonly earningsService = inject(EarningsService);

  activity = signal<UserEarningsActivityItem[]>([]);
  activityLoading = signal(false);
  metrics = signal<EarningsMetricsResponse | null>(null);
  metricsLoading = signal(false);
  readonly pageSize = 50;

  /** Track which rows are expanded to show metadata. */
  expandedRowIds = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.reloadAll();
  }

  reloadAll(): void {
    this.loadActivity(true, 0);
    this.loadMetrics();
  }

  loadMore(): void {
    this.loadActivity(false, this.activity().length);
  }

  private loadActivity(replace: boolean, offset: number): void {
    this.activityLoading.set(true);
    this.earningsService
      .getGlobalActivityRaw({ limit: this.pageSize, offset })
      .subscribe({
        next: (res) => {
          const items = res?.items ?? [];
          if (replace) {
            this.activity.set(items);
          } else {
            this.activity.update((prev) => [...prev, ...items]);
          }
          this.activityLoading.set(false);
        },
        error: () => {
          if (replace) this.activity.set([]);
          this.activityLoading.set(false);
        }
      });
  }

  private loadMetrics(): void {
    this.metricsLoading.set(true);
    this.earningsService.getEarningsMetrics().subscribe({
      next: (m) => {
        this.metrics.set(m);
        this.metricsLoading.set(false);
      },
      error: () => {
        this.metrics.set(null);
        this.metricsLoading.set(false);
      }
    });
  }

  formatAvgProcessing(ms: number): string {
    if (!ms || ms <= 0) return '—';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  metricsBarWidth(): number {
    const tpm = this.metrics()?.transactionsPerMinute ?? 0;
    const capped = Math.min(tpm, 200);
    return Math.round((capped / 200) * 100);
  }

  // ── Table helpers ──

  formatActivityAmount = formatUserEarningsActivityAmount;
  activityTrack = userEarningsActivityTrackId;

  toggleExpandedRow(row: UserEarningsActivityItem): void {
    const key = row.id || row.reference || row.sourceId || '';
    if (!key) return;
    this.expandedRowIds.update(set => {
      const next = new Set(set);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  isRowExpanded(row: UserEarningsActivityItem): boolean {
    const key = row.id || row.reference || row.sourceId || '';
    return this.expandedRowIds().has(key);
  }

  /**
   * Human-readable source label from earningType or source.
   */
  getSourceLabel(row: UserEarningsActivityItem): string {
    if (row.earningType) {
      return getEarningTypeLabel(row.earningType);
    }
    if (row.source) {
      return getEarningTypeLabel(row.source);
    }
    return '—';
  }

  /**
   * Optional sublabel showing extra context (e.g. metadata source, package).
   */
  getSourceSublabel(row: UserEarningsActivityItem): string {
    const meta = row.metadata as Record<string, unknown> | undefined;
    const metaSource = meta?.['source'] as string | undefined;
    const pkg = meta?.['package'] as string | undefined;
    const parts: string[] = [];
    if (metaSource) parts.push(metaSource);
    if (pkg) parts.push(pkg);
    return parts.join(' · ');
  }

  /**
   * Safely access a value from the row's metadata object.
   */
  getMetaValue(row: UserEarningsActivityItem, key: string): any {
    const meta = row.metadata as Record<string, unknown> | undefined;
    return meta?.[key] ?? null;
  }

  /**
   * Format SCREAMING_SNAKE_CASE strings to readable text.
   */
  formatPurpose(purpose: string): string {
    if (!purpose) return '—';
    return purpose
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Short user identifier from the raw item (userName, userEmail, or truncated userId).
   */
  getUserLabel(row: UserEarningsActivityItem): string {
    const raw = row as any;
    return raw.userName || raw.userEmail || (row.userId ? row.userId.slice(0, 10) + '…' : '—');
  }
}
