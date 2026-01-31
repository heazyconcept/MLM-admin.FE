import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressBarModule } from 'primeng/progressbar';

export interface SavingsPlan {
  id: string;
  name: string;
  icon: string;
  iconBg: string;
  current: number;
  target: number;
  progress: number;
}

@Component({
  selector: 'app-savings-plan',
  imports: [CommonModule, ProgressBarModule],
  templateUrl: './savings-plan.component.html',
  styleUrls: ['./savings-plan.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SavingsPlanComponent {
  plans = input<SavingsPlan[]>([]);

  formatCurrency(value: number): string {
    return '$' + value.toLocaleString();
  }
}

