import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { EarningsService } from '../services/earnings.service';

@Component({
  selector: 'app-earnings-overview',
  standalone: true,
  imports: [CommonModule, ChartModule],
  templateUrl: './earnings-overview.component.html'
})
export class EarningsOverviewComponent {
  earningsService = inject(EarningsService);
  
  overview = signal(this.earningsService.getSystemOverview());

  // Chart Data
  barData: any;
  barOptions: any;
  doughnutData: any;
  doughnutOptions: any;

  constructor() {
    this.initCharts();
  }

  initCharts() {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

    this.barData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
            {
                label: 'Payouts ($)',
                backgroundColor: documentStyle.getPropertyValue('--mlm-primary'),
                borderColor: documentStyle.getPropertyValue('--mlm-primary'),
                data: [65000, 59000, 80000, 81000, 56000, 95000],
                borderRadius: 6
            }
        ]
    };

    this.barOptions = {
        maintainAspectRatio: false,
        aspectRatio: 0.8,
        plugins: {
            legend: {
                labels: {
                    color: textColor
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: textColorSecondary,
                    font: {
                        weight: 500
                    }
                },
                grid: {
                    color: surfaceBorder,
                    drawBorder: false
                }
            },
            y: {
                ticks: {
                    color: textColorSecondary
                },
                grid: {
                    color: surfaceBorder,
                    drawBorder: false
                }
            }
        }
    };

    this.doughnutData = {
        labels: ['Direct Referral', 'Matching Bonus', 'Binary Pair', 'Leadership'],
        datasets: [
            {
                data: [40, 25, 20, 15],
                backgroundColor: [
                    documentStyle.getPropertyValue('--mlm-primary'), 
                    '#3b82f6', 
                    '#ef4444', 
                    '#f59e0b'
                ],
                hoverBackgroundColor: [
                    documentStyle.getPropertyValue('--mlm-primary'), 
                    '#2563eb', 
                    '#dc2626', 
                    '#d97706'
                ]
            }
        ]
    };

    this.doughnutOptions = {
        maintainAspectRatio: false,
        aspectRatio: 1,
        cutout: '60%',
        plugins: {
            legend: {
                labels: {
                    color: textColor
                }
            }
        }
    };
  }
}
