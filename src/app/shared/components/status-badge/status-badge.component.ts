import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeStatus = 'Active' | 'Suspended' | 'Flagged' | 'Pending' | 'Success' | 'Successful' | 'Failed' | 'Approved' | 'Rejected' | 'Processing' | 'Paid' | 'Reversed' | 'Locked' | 'Frozen';

@Component({
  selector: 'app-status-badge',
  imports: [CommonModule],
  template: `
    <span 
      class="inline-flex items-center gap-1.5 rounded-full text-xs font-bold uppercase tracking-wider"
      [class]="badgeClasses()"
      [class.px-3]="!hideLabel()"
      [class.py-1.5]="!hideLabel()"
      [class.p-1.5]="hideLabel()">
      <span class="w-1.5 h-1.5 rounded-full" [class]="dotClass()"></span>
      @if (!hideLabel()) {
        <span>{{ status() === 'Successful' ? 'Success' : status() }}</span>
      }
    </span>
  `,
  styles: [`:host { display: inline-block; }`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusBadgeComponent {
  status = input<BadgeStatus>('Active');
  hideLabel = input<boolean>(false);

  badgeClasses = computed(() => {
    const s = this.status();
    const classes: Record<BadgeStatus, string> = {
      'Active': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      'Suspended': 'bg-red-50 text-red-700 border border-red-200',
      'Flagged': 'bg-amber-50 text-amber-700 border border-amber-200',
      'Pending': 'bg-orange-50 text-orange-700 border border-orange-200',
      'Success': 'bg-green-50 text-green-700 border border-green-200',
      'Successful': 'bg-green-50 text-green-700 border border-green-200',
      'Failed': 'bg-red-50 text-red-700 border border-red-200',
      'Approved': 'bg-blue-50 text-blue-700 border border-blue-200',
      'Rejected': 'bg-rose-50 text-rose-700 border border-rose-200',
      'Processing': 'bg-purple-50 text-purple-700 border border-purple-200',
      'Paid': 'bg-teal-50 text-teal-700 border border-teal-200',
      'Reversed': 'bg-gray-50 text-gray-700 border border-gray-300',
      'Locked': 'bg-red-50 text-red-700 border border-red-200',
      'Frozen': 'bg-cyan-50 text-cyan-700 border border-cyan-200'
    };
    return classes[s] || classes['Active'];
  });

  dotClass = computed(() => {
    const s = this.status();
    const classes: Record<BadgeStatus, string> = {
      'Active': 'bg-emerald-600',
      'Suspended': 'bg-red-600',
      'Flagged': 'bg-amber-600',
      'Pending': 'bg-orange-600',
      'Success': 'bg-green-600',
      'Successful': 'bg-green-600',
      'Failed': 'bg-red-600',
      'Approved': 'bg-blue-600',
      'Rejected': 'bg-rose-600',
      'Processing': 'bg-purple-600',
      'Paid': 'bg-teal-600',
      'Reversed': 'bg-gray-600',
      'Locked': 'bg-red-600',
      'Frozen': 'bg-cyan-600'
    };
    return classes[s] || classes['Active'];
  });
}

