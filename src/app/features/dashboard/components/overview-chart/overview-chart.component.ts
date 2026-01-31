import { ChangeDetectionStrategy, Component, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';

@Component({
  selector: 'app-overview-chart',
  imports: [CommonModule, ChartModule],
  templateUrl: './overview-chart.component.html',
  styleUrls: ['./overview-chart.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OverviewChartComponent implements OnInit {
  title = input('Revenue Trend');
  totalValue = input('$1,245,890.00');
  chartData = input<number[]>([]);
  
  data: unknown;
  options: unknown;
  
  selectedPeriod = 'This Year';

  ngOnInit() {  
    this.initChart();
  }

  initChart() {
    const primaryColor = '#49A321';
    const primaryLightColor = '#86efac';
    
    const defaultData = [85000, 120000, 95000, 140000, 110000, 160000, 130000, 190000, 155000, 170000, 145000, 200000];
    
    this.data = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      datasets: [
        {
          label: 'Revenue',
          data: this.chartData().length > 0 ? this.chartData() : defaultData,
          backgroundColor: (context: { dataIndex: number }) => {
            const index = context.dataIndex;
            const currentMonth = new Date().getMonth();
            return index === currentMonth ? primaryColor : primaryLightColor;
          },
          borderRadius: 6,
          borderSkipped: false,
        }
      ]
    };

    this.options = {
      maintainAspectRatio: false,
      aspectRatio: 1.5,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 12,
          displayColors: false,
          callbacks: {
            label: (context: { raw: number }) => {
              return `$${context.raw.toLocaleString()}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#64748b',
            font: {
              size: 12
            }
          }
        },
        y: {
          grid: {
            color: '#f1f5f9',
            drawBorder: false
          },
          ticks: {
            color: '#64748b',
            font: {
              size: 12
            },
            callback: (value: number) => {
              if (value >= 1000) {
                return '$' + (value / 1000) + 'k';
              }
              return '$' + value;
            }
          }
        }
      }
    };
  }
}
