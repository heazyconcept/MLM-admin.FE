import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { EarningsService } from '../services/earnings.service';

@Component({
  selector: 'app-earnings-monitoring',
  standalone: true,
  imports: [CommonModule, TagModule, ButtonModule],
  templateUrl: './earnings-monitoring.component.html'
})
export class EarningsMonitoringComponent {
  earningsService = inject(EarningsService);
  activity = this.earningsService.recentActivity;

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' {
      switch (status) {
          case 'Processed': return 'success';
          case 'Pending': return 'warn';
          case 'Failed': return 'danger';
          default: return 'info';
      }
  }
}
