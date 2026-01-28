import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stat-card.component.html',
  styleUrls: ['./stat-card.component.css']
})
export class StatCardComponent {
  @Input() title = '';
  @Input() value = '';
  @Input() subtitle = '';
  @Input() icon = '';
  @Input() iconBg = 'bg-mlm-green-100';
  @Input() iconColor = 'text-mlm-primary';
  @Input() change: number | null = null;
  @Input() changeLabel = 'from last month';
  @Input() showMenu = true;
  @Input() compact = false;

  get isPositive(): boolean {
    return this.change !== null && this.change >= 0;
  }

  get changeFormatted(): string {
    if (this.change === null) return '';
    const sign = this.isPositive ? '+' : '';
    return `${sign}${this.change}%`;
  }
}
