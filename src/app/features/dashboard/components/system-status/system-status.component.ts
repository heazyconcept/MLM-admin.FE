import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-system-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './system-status.component.html',
  styleUrls: ['./system-status.component.css']
})
export class SystemStatusComponent {
  @Input() status: 'online' | 'offline' | 'maintenance' = 'online';
  @Input() uptime = '99.9%';
  @Input() lastChecked = new Date();

  get statusConfig() {
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
    return configs[this.status];
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
}

