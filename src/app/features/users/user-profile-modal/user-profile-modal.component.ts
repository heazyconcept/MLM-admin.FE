import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, output, model, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { User } from '../services/users.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-user-profile-modal',
  imports: [CommonModule, DialogModule, ButtonModule, StatusBadgeComponent],
  templateUrl: './user-profile-modal.component.html',
  styleUrls: ['./user-profile-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserProfileModalComponent {
  visible = model(false);
  user = input<User | null>(null);

  actionClick = output<{ action: string; user: User }>();

  activeTab = 'basic';

  close(): void {
    this.visible.set(false);
  }

  onAction(action: string): void {
    const currentUser = this.user();
    if (currentUser) {
      this.actionClick.emit({ action, user: currentUser });
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

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

