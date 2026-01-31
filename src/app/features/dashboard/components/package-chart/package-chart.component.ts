import { Component, input, OnInit, ChangeDetectionStrategy, computed } from '@angular/core';
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
export class PackageChartComponent implements OnInit {
  packages = input<PackageData[]>([]);
  
  data: unknown;
  options: unknown;
  totalUsers = 0;

  ngOnInit() {
    this.initChart();
  }

  initChart() {
    // Default MLM package data
    const defaultPackages: PackageData[] = [
      { name: 'Silver', count: 4520, percentage: 45.2, color: '#94a3b8' },
      { name: 'Gold', count: 2890, percentage: 28.9, color: '#F9A825' },
      { name: 'Platinum', count: 1560, percentage: 15.6, color: '#64748b' },
      { name: 'Ruby', count: 680, percentage: 6.8, color: '#ef4444' },
      { name: 'Diamond', count: 350, percentage: 3.5, color: '#3b82f6' }
    ];

    const packagesToUse = this.packages().length > 0 ? this.packages() : defaultPackages;
    this.totalUsers = packagesToUse.reduce((sum: number, p: PackageData) => sum + p.count, 0);

    this.data = {
      labels: packagesToUse.map((p: PackageData) => p.name),
      datasets: [
        {
          data: packagesToUse.map((p: PackageData) => p.count),
          backgroundColor: packagesToUse.map((p: PackageData) => p.color),
          borderWidth: 0,
          hoverOffset: 8
        }
      ]
    };

    this.options = {
      cutout: '65%',
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 12,
          displayColors: true,
          callbacks: {
            label: (context: { raw: number; label: string }) => {
              const percentage = ((context.raw / this.totalUsers) * 100).toFixed(1);
              return `${context.label}: ${context.raw.toLocaleString()} (${percentage}%)`;
            }
          }
        }
      }
    };
  }

  packageList = computed(() => {
    if (this.packages().length > 0) return this.packages();
    return [
      { name: 'Silver', count: 4520, percentage: 45.2, color: '#94a3b8' },
      { name: 'Gold', count: 2890, percentage: 28.9, color: '#F9A825' },
      { name: 'Platinum', count: 1560, percentage: 15.6, color: '#64748b' },
      { name: 'Ruby', count: 680, percentage: 6.8, color: '#ef4444' },
      { name: 'Diamond', count: 350, percentage: 3.5, color: '#3b82f6' }
    ];
  });
}
