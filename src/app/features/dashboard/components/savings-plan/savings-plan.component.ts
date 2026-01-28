import { Component, Input } from '@angular/core';
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
  standalone: true,
  imports: [CommonModule, ProgressBarModule],
  templateUrl: './savings-plan.component.html',
  styleUrls: ['./savings-plan.component.css']
})
export class SavingsPlanComponent {
  @Input() plans: SavingsPlan[] = [];

  formatCurrency(value: number): string {
    return '$' + value.toLocaleString();
  }
}

