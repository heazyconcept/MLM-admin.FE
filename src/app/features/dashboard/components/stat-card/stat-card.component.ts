import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  imports: [CommonModule],
  templateUrl: './stat-card.component.html',
  styleUrls: ['./stat-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatCardComponent {
  title = input('');
  value = input('');
  subtitle = input('');
  icon = input('');
  iconBg = input('bg-mlm-green-100');
  iconColor = input('text-mlm-primary');
  change = input<number | null>(null);
  changeLabel = input('from last month');
  showMenu = input(true);
  compact = input(false);

  isPositive = computed(() => {
    const changeVal = this.change();
    return changeVal !== null && changeVal >= 0;
  });

  changeFormatted = computed(() => {
    const changeVal = this.change();
    if (changeVal === null) return '';
    const sign = this.isPositive() ? '+' : '';
    return `${sign}${changeVal}%`;
  });
}
