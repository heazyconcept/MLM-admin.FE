import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-system-status',
  imports: [CommonModule],
  templateUrl: './system-status.component.html',
  styleUrls: ['./system-status.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SystemStatusComponent {
  status = input<'online' | 'offline' | 'maintenance'>('online');
  uptime = input('99.9%');
  lastChecked = input(new Date());

  statusConfig = computed(() => {
    const configs = {
      online: {
        label: 'All Systems Operational',
        color: 'bg-mlm-success',
        textColor: 'text-mlm-success',
        bgLight: 'bg-mlm-success/10',
        icon: 'pi-check-circle'
      },
      offline: {
        label: 'System Offline',
        color: 'bg-mlm-error',
        textColor: 'text-mlm-error',
        bgLight: 'bg-mlm-error/10',
        icon: 'pi-times-circle'
      },
      maintenance: {
        label: 'Under Maintenance',
        color: 'bg-mlm-warning',
        textColor: 'text-mlm-warning',
        bgLight: 'bg-mlm-warning/10',
        icon: 'pi-exclamation-triangle'
      }
    };
    return configs[this.status()];
  });

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
}

