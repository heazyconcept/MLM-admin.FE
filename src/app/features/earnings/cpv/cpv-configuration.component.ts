import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { EarningsService } from '../services/earnings.service';

@Component({
  selector: 'app-cpv-configuration',
  imports: [CommonModule, ButtonModule],
  templateUrl: './cpv-configuration.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CpvConfigurationComponent {
  earningsService = inject(EarningsService);
  rules = this.earningsService.cpvRules;

  getPackageClass(pkg: string): string {
    const classes: Record<string, string> = {
      'Silver': 'bg-slate-100 text-slate-600 border border-slate-200',
      'Gold': 'bg-amber-100 text-amber-700 border border-amber-200',
      'Platinum': 'bg-zinc-100 text-zinc-700 border border-zinc-200',
      'Ruby': 'bg-rose-100 text-rose-700 border border-rose-200',
      'Diamond': 'bg-sky-100 text-sky-700 border border-sky-200'
    };
    return classes[pkg] || 'bg-gray-100 text-gray-800';
  }
}
