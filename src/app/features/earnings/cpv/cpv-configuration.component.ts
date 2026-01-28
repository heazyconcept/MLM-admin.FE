import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { EarningsService } from '../services/earnings.service';

@Component({
  selector: 'app-cpv-configuration',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './cpv-configuration.component.html'
})
export class CpvConfigurationComponent {
  earningsService = inject(EarningsService);
  rules = this.earningsService.cpvRules;

  getPackageColor(pkg: string): string {
    const colors: Record<string, string> = {
      'Silver': '#94a3b8',
      'Gold': '#F9A825',
      'Platinum': '#64748b',
      'Ruby': '#ef4444',
      'Diamond': '#3b82f6'
    };
    return colors[pkg] || '#94a3b8';
  }
}
