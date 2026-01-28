import { Component, OnInit, inject, signal } from '@angular/core';
// Trigger re-build
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ConfirmationModalComponent, ConfirmationResult } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { UsersService, User } from '../services/users.service';

interface ActionConfig {
  visible: boolean;
  title: string;
  message: string;
  icon: string;
  iconClass: string;
  confirmLabel: string;
  confirmClass: string;
  showReasonField: boolean;
  reasonRequired: boolean;
  action: string;
}

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    ButtonModule, 
    ToastModule,
    StatusBadgeComponent,
    ConfirmationModalComponent
  ],
  providers: [MessageService],
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.css']
})
export class UserDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private usersService = inject(UsersService);
  private messageService = inject(MessageService);

  user = signal<User | null>(null);
  activeTab = signal('basic');
  
  actionConfig: ActionConfig = {
    visible: false,
    title: '',
    message: '',
    icon: '',
    iconClass: '',
    confirmLabel: '',
    confirmClass: '',
    showReasonField: false,
    reasonRequired: false,
    action: ''
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadUser(id);
    } else {
      this.router.navigate(['/admin/users']);
    }
  }

  loadUser(id: string): void {
    const foundUser = this.usersService.getUserById(id);
    if (foundUser) {
      this.user.set(foundUser);
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'User not found'
      });
      setTimeout(() => this.router.navigate(['/admin/users']), 2000);
    }
  }

  onAction(action: string): void {
    const user = this.user();
    if (!user) return;

    const configs: Record<string, Partial<ActionConfig>> = {
      suspend: {
        title: 'Suspend User',
        message: `Are you sure you want to suspend ${user.fullName}'s account?`,
        icon: 'pi pi-ban',
        iconClass: 'text-mlm-error',
        confirmLabel: 'Suspend',
        confirmClass: 'p-button-danger',
        showReasonField: true,
        reasonRequired: true
      },
      reactivate: {
        title: 'Reactivate User',
        message: `Are you sure you want to reactivate ${user.fullName}'s account?`,
        icon: 'pi pi-check-circle',
        iconClass: 'text-mlm-success',
        confirmLabel: 'Reactivate',
        confirmClass: 'p-button-success',
        showReasonField: false,
        reasonRequired: false
      },
      flag: {
        title: 'Flag Account',
        message: `Are you sure you want to flag ${user.fullName}'s account for review?`,
        icon: 'pi pi-flag',
        iconClass: 'text-mlm-warning',
        confirmLabel: 'Flag Account',
        confirmClass: 'p-button-warning',
        showReasonField: true,
        reasonRequired: true
      },
      unflag: {
        title: 'Remove Flag',
        message: `Are you sure you want to remove the flag from ${user.fullName}'s account?`,
        icon: 'pi pi-flag-fill',
        iconClass: 'text-mlm-secondary',
        confirmLabel: 'Remove Flag',
        confirmClass: 'p-button-primary',
        showReasonField: false,
        reasonRequired: false
      },
      resetPassword: {
        title: 'Reset Password',
        message: `Are you sure you want to reset ${user.fullName}'s password? A temporary password will be sent to their email.`,
        icon: 'pi pi-key',
        iconClass: 'text-mlm-blue-600',
        confirmLabel: 'Reset Password',
        confirmClass: 'p-button-primary',
        showReasonField: false,
        reasonRequired: false
      }
    };

    const config = configs[action];
    if (config) {
      this.actionConfig = {
        visible: true,
        action,
        ...config
      } as ActionConfig;
    }
  }

  onActionConfirm(result: ConfirmationResult): void {
    const user = this.user();
    if (!user || !result.confirmed) return;

    const action = this.actionConfig.action;

    switch (action) {
      case 'suspend':
        this.usersService.updateUserStatus(user.id, 'Suspended', result.reason || '');
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'User suspended' });
        break;
      case 'reactivate':
        this.usersService.updateUserStatus(user.id, 'Active', '');
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'User reactivated' });
        break;
      case 'flag':
        this.usersService.updateUserStatus(user.id, 'Flagged', result.reason || '');
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Account flagged' });
        break;
      case 'unflag':
        this.usersService.updateUserStatus(user.id, 'Active', '');
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Flag removed' });
        break;
      case 'resetPassword':
        this.usersService.addActivityLog(user.id, 'Password reset requested');
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Password reset link sent' });
        break;
    }

    this.loadUser(user.id);
    this.actionConfig.visible = false;
  }

  onActionCancel(): void {
    this.actionConfig.visible = false;
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

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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
