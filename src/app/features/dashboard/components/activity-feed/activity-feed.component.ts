import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Activity {
  id: string;
  type: 'registration' | 'earning' | 'withdrawal' | 'order';
  title: string;
  description: string;
  amount?: string;
  timestamp: Date;
  user?: string;
}

@Component({
  selector: 'app-activity-feed',
  imports: [CommonModule],
  templateUrl: './activity-feed.component.html',
  styleUrls: ['./activity-feed.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityFeedComponent {
  activities = input<Activity[]>([]);
  loading = input(false);

  defaultActivities = computed<Activity[]>(() => {
    return [
      {
        id: '1',
        type: 'registration',
        title: 'New User Registration',
        description: 'Sarah Johnson joined as Gold member',
        timestamp: new Date(Date.now() - 5 * 60000),
        user: 'Sarah Johnson'
      },
      {
        id: '2',
        type: 'earning',
        title: 'Earnings Posted',
        description: 'Direct Referral Bonus credited',
        amount: '+$450.00',
        timestamp: new Date(Date.now() - 15 * 60000),
        user: 'Mike Chen'
      },
      {
        id: '3',
        type: 'withdrawal',
        title: 'Withdrawal Processed',
        description: 'Bank transfer completed',
        amount: '-$2,500.00',
        timestamp: new Date(Date.now() - 30 * 60000),
        user: 'John Doe'
      },
      {
        id: '4',
        type: 'order',
        title: 'Order Fulfilled',
        description: 'Product order #ORD-4521 shipped',
        amount: '$156.00',
        timestamp: new Date(Date.now() - 45 * 60000),
        user: 'Emma Wilson'
      },
      {
        id: '5',
        type: 'registration',
        title: 'New Merchant',
        description: 'ABC Store approved as Regional Merchant',
        timestamp: new Date(Date.now() - 60 * 60000),
        user: 'ABC Store'
      }
    ];
  });

  displayActivities = computed(() => {
    return this.activities().length > 0 ? this.activities() : this.defaultActivities();
  });

  /** Minimal left accent (no icons). */
  getTypeAccent(type: string): string {
    const map: Record<string, string> = {
      registration: 'bg-emerald-500',
      earning: 'bg-[#49A321]',
      withdrawal: 'bg-amber-500',
      order: 'bg-slate-400'
    };
    return map[type] ?? 'bg-slate-300';
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  }
}

