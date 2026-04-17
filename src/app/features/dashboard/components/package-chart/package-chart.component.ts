import {
  Component,
  input,
  ChangeDetectionStrategy,
  computed,
  effect,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';

export interface PackageData {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

@Component({
  selector: 'app-package-chart',
  imports: [CommonModule, ChartModule],
  templateUrl: './package-chart.component.html',
  styleUrls: ['./package-chart.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PackageChartComponent {
  packages = input<PackageData[]>([]);
  loading = input(false);

  data = signal<unknown>({ labels: [], datasets: [] });
  options = signal<unknown>({});
  totalUsers = signal(0);

  packageList = computed(() => {
    const p = this.packages();
    if (p.length > 0) return p;
    return [] as PackageData[];
  });

  constructor() {
    effect(() => {
      this.packages();
      this.initChart();
    });
  }

  private initChart(): void {
    const fromInput = this.packages();
    if (!fromInput.length) {
      this.totalUsers.set(0);
      this.data.set({
        labels: ['No data'],
        datasets: [
          {
            data: [1],
            backgroundColor: ['#e5e7eb'],
            borderWidth: 0,
            hoverOffset: 0
          }
        ]
      });
      this.options.set({
        cutout: '65%',
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } }
      });
      return;
    }

    const packagesToUse = fromInput;
    const total = packagesToUse.reduce((sum, p) => sum + p.count, 0);
    this.totalUsers.set(total);

    this.data.set({
      labels: packagesToUse.map((p) => p.name),
      datasets: [
        {
          data: packagesToUse.map((p) => p.count),
          backgroundColor: packagesToUse.map((p) => p.color),
          borderWidth: 0,
          hoverOffset: 8
        }
      ]
    });

    const totalRef = total;
    this.options.set({
      cutout: '65%',
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 12,
          displayColors: true,
          callbacks: {
            label: (context: { raw: number; label: string }) => {
              const pct =
                totalRef > 0 ? ((context.raw / totalRef) * 100).toFixed(1) : '0';
              return `${context.label}: ${context.raw.toLocaleString()} (${pct}%)`;
            }
          }
        }
      }
    });
  }
}
