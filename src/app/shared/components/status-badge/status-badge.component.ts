import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeStatus = 'Active' | 'Suspended' | 'Flagged' | 'Pending' | 'Success' | 'Failed';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span 
      class="inline-flex items-center gap-1.5 rounded-full text-xs font-medium"
      [class]="badgeClasses"
      [class.px-2.5]="!hideLabel"
      [class.py-1]="!hideLabel"
      [class.p-1.5]="hideLabel">
      <span class="w-1.5 h-1.5 rounded-full" [class]="dotClass"></span>
      @if (!hideLabel) {
        <span>{{ status }}</span>
      }
    </span>
  `,
  styles: [`:host { display: inline-block; }`]
})
export class StatusBadgeComponent {
  @Input() status: BadgeStatus = 'Active';
  @Input() hideLabel = false;

  get badgeClasses(): string {
    const classes: Record<BadgeStatus, string> = {
      'Active': 'bg-mlm-success/10 text-mlm-success',
      'Suspended': 'bg-mlm-error/10 text-mlm-error',
      'Flagged': 'bg-mlm-warning/10 text-mlm-warning',
      'Pending': 'bg-mlm-blue-100 text-mlm-blue-600',
      'Success': 'bg-mlm-success/10 text-mlm-success',
      'Failed': 'bg-mlm-error/10 text-mlm-error'
    };
    return classes[this.status] || classes['Active'];
  }

  get dotClass(): string {
    const classes: Record<BadgeStatus, string> = {
      'Active': 'bg-mlm-success',
      'Suspended': 'bg-mlm-error',
      'Flagged': 'bg-mlm-warning',
      'Pending': 'bg-mlm-blue-600',
      'Success': 'bg-mlm-success',
      'Failed': 'bg-mlm-error'
    };
    return classes[this.status] || classes['Active'];
  }
}

