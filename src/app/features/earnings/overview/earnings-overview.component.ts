import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { ButtonModule } from 'primeng/button';
import {
  EarningsService,
  EarningsOverviewResponse,
  EarningsOverviewSummary
} from '../services/earnings.service';

@Component({
  selector: 'app-earnings-overview',
  imports: [CommonModule, ChartModule, ButtonModule],
  templateUrl: './earnings-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EarningsOverviewComponent implements OnInit {
  private readonly earningsService = inject(EarningsService);

  overviewData = signal<EarningsOverviewResponse | null>(null);
  loading = signal(false);
  loadError = signal<string | null>(null);
  lastLoadedAt = signal<Date | null>(null);

  barData: unknown = { labels: [], datasets: [] };
  barOptions: unknown = {};
  doughnutData: unknown = { labels: [], datasets: [] };
  doughnutOptions: unknown = {};

  summary = signal<EarningsOverviewSummary | null>(null);

  ngOnInit(): void {
    this.initChartOptions();
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.earningsService.getEarningsOverview().subscribe({
      next: (res) => {
        if (!res) {
          this.loadError.set('Failed to load earnings overview');
          this.overviewData.set(null);
          this.summary.set(null);
          this.applyCharts(null);
        } else {
          this.loadError.set(null);
          this.overviewData.set(res);
          this.summary.set(res.summary ?? null);
          this.lastLoadedAt.set(new Date());
          this.applyCharts(res);
        }
        this.loading.set(false);
      }
    });
  }

  private initChartOptions(): void {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

    this.barOptions = {
      maintainAspectRatio: false,
      aspectRatio: 0.8,
      plugins: {
        legend: { labels: { color: textColor } }
      },
      scales: {
        x: {
          ticks: { color: textColorSecondary, font: { weight: 500 } },
          grid: { color: surfaceBorder, drawBorder: false }
        },
        y: {
          ticks: { color: textColorSecondary },
          grid: { color: surfaceBorder, drawBorder: false }
        }
      }
    };

    this.doughnutOptions = {
      maintainAspectRatio: false,
      aspectRatio: 1,
      cutout: '60%',
      plugins: {
        legend: { labels: { color: textColor } }
      }
    };
  }

  private applyCharts(res: EarningsOverviewResponse | null): void {
    const documentStyle = getComputedStyle(document.documentElement);
    const primary = documentStyle.getPropertyValue('--mlm-primary') || '#16a34a';

    if (!res?.chartBuckets?.length) {
      this.barData = {
        labels: ['—'],
        datasets: [
          {
            label: 'Earnings',
            backgroundColor: primary,
            borderColor: primary,
            data: [0],
            borderRadius: 6
          },
          {
            label: 'CPV',
            backgroundColor: '#3b82f6',
            borderColor: '#3b82f6',
            data: [0],
            borderRadius: 6
          }
        ]
      };
    } else {
      const labels = res.chartBuckets.map((b) => this.formatBucketLabel(b.date));
      this.barData = {
        labels,
        datasets: [
          {
            label: 'Earnings',
            backgroundColor: primary,
            borderColor: primary,
            data: res.chartBuckets.map((b) => Number(b.earnings) || 0),
            borderRadius: 6
          },
          {
            label: 'CPV',
            backgroundColor: '#3b82f6',
            borderColor: '#3b82f6',
            data: res.chartBuckets.map((b) => Number(b.cpv) || 0),
            borderRadius: 6
          }
        ]
      };
    }

    const byType = res?.byType && Object.keys(res.byType).length ? res.byType : null;
    if (!byType) {
      this.doughnutData = {
        labels: ['No data'],
        datasets: [
          {
            data: [1],
            backgroundColor: ['#e5e7eb'],
            hoverBackgroundColor: ['#d1d5db']
          }
        ]
      };
    } else {
      const entries = Object.entries(byType);
      const palette = [primary, '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#64748b'];
      this.doughnutData = {
        labels: entries.map(([k]) => k),
        datasets: [
          {
            data: entries.map(([, v]) => Number(v) || 0),
            backgroundColor: entries.map((_, i) => palette[i % palette.length]),
            hoverBackgroundColor: entries.map((_, i) => palette[i % palette.length])
          }
        ]
      };
    }
  }

  private formatBucketLabel(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}
