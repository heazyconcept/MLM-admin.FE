import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-performance-card',
  imports: [CommonModule],
  templateUrl: './performance-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerformanceCardComponent {
  // Inputs
  ordersFulfilled = input<number>(0);
  deliverySuccessRate = input<number>(0);
  earnings = input<number>(0);
  customerRating = input<number | null>(null);

  // Format currency
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  // Format percentage
  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }
}
