import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import {
  EarningsService,
  EarningsActivity,
  EarningsMetricsResponse
} from '../services/earnings.service';

@Component({
  selector: 'app-earnings-monitoring',
  imports: [CommonModule, TagModule, ButtonModule, ProgressBarModule],
  templateUrl: './earnings-monitoring.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EarningsMonitoringComponent implements OnInit {
  private readonly earningsService = inject(EarningsService);

  activity = signal<EarningsActivity[]>([]);
  activityLoading = signal(false);
  metrics = signal<EarningsMetricsResponse | null>(null);
  metricsLoading = signal(false);
  readonly pageSize = 50;

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
      .getGlobalActivity({ limit: this.pageSize, offset })
      .subscribe({
        next: (items) => {
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

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (status) {
      case 'Processed':
        return 'success';
      case 'Pending':
        return 'warn';
      case 'Failed':
        return 'danger';
      default:
        return 'info';
    }
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
}
