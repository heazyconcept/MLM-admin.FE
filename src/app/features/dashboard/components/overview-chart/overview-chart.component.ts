import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import type { RevenueTrendPoint } from '../../dashboard.service';

@Component({
  selector: 'app-overview-chart',
  imports: [CommonModule, ChartModule],
  templateUrl: './overview-chart.component.html',
  styleUrls: ['./overview-chart.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OverviewChartComponent {
  title = input('Revenue trend');
  totalValue = input('—');
  /** When set, chart uses these points (e.g. last 30 days from dashboard summary). */
  revenueTrend = input<RevenueTrendPoint[]>([]);
  loading = input(false);

  data = signal<unknown>({ labels: [], datasets: [] });
  options = signal<unknown>({});

  constructor() {
    effect(() => {
      this.revenueTrend();
      this.rebuildChart();
    });
  }

  private rebuildChart(): void {
    const primaryColor = '#49A321';
    const primaryLightColor = '#86efac';
    const points = this.revenueTrend();

    if (!points.length) {
      this.data.set({
        labels: ['—'],
        datasets: [
          {
            label: 'Revenue',
            data: [0],
            backgroundColor: primaryLightColor,
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      });
    } else {
      const labels = points.map((p) => this.formatLabel(p.date));
      const amounts = points.map((p) => Number(p.amount) || 0);
      const maxIdx = amounts.reduce(
        (best, v, i, arr) => (v > arr[best] ? i : best),
        0
      );
      const bg = amounts.map((_, i) => (i === maxIdx ? primaryColor : primaryLightColor));
      this.data.set({
        labels,
        datasets: [
          {
            label: 'Revenue',
            data: amounts,
            backgroundColor: bg,
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      });
    }

    this.options.set({
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 12,
          displayColors: false,
          callbacks: {
            label: (ctx: { raw: number }) => this.formatAmount(ctx.raw)
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#64748b', font: { size: 11 }, maxRotation: 45, minRotation: 0 }
        },
        y: {
          grid: { color: '#f1f5f9', drawBorder: false },
          ticks: {
            color: '#64748b',
            font: { size: 12 },
            callback: (value: number | string) => this.formatAxisTick(Number(value))
          }
        }
      }
    });
  }

  private formatLabel(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  private formatAmount(n: number): string {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(n);
  }

  private formatAxisTick(value: number): string {
    if (!Number.isFinite(value)) return '';
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
    if (abs >= 1_000) return (value / 1_000).toFixed(1) + 'k';
    return String(value);
  }
}
