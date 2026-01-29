import { Component, signal, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
import { DataTableComponent } from '../data-table.component';
import { TableColumn, TableAction } from '../data-table.types';
import { StatusBadgeComponent } from '../../status-badge/status-badge.component';

interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  package: string;
  status: string;
  registrationDate: Date;
}

@Component({
  selector: 'app-data-table-example',
  imports: [DataTableComponent, StatusBadgeComponent],
  template: `
    <div class="p-6">
      <h2 class="text-xl font-bold mb-4">Data Table Example</h2>
      
      <app-data-table
        [data]="users()"
        [columns]="columns()"
        [actions]="actions()"
        [loading]="loading()">
        
        <!-- Custom user cell template -->
        <ng-template #userCell let-user>
          <div class="flex flex-col">
            <span class="font-semibold text-gray-900">{{ user.fullName }}</span>
            <span class="text-xs text-gray-500">@{{ user.username }}</span>
          </div>
        </ng-template>

        <!-- Custom status cell template -->
        <ng-template #statusCell let-user>
          <app-status-badge [status]="user.status"></app-status-badge>
        </ng-template>

        <!-- Custom package cell template -->
        <ng-template #packageCell let-user>
          <span 
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase"
            [style.background-color]="getPackageColor(user.package) + '15'"
            [style.color]="getPackageColor(user.package)">
            {{ user.package }}
          </span>
        </ng-template>

        <!-- Table actions slot -->
        <div tableActions class="flex gap-2">
          <button 
            pButton 
            label="Export" 
            icon="pi pi-download"
            class="p-button-outlined">
          </button>
        </div>
      </app-data-table>
    </div>
  `
})
export class DataTableExampleComponent implements AfterViewInit {
  @ViewChild('userCell') userCellTemplate!: TemplateRef<any>;
  @ViewChild('statusCell') statusCellTemplate!: TemplateRef<any>;
  @ViewChild('packageCell') packageCellTemplate!: TemplateRef<any>;

  loading = signal(false);
  columns = signal<TableColumn<User>[]>([]);

  users = signal<User[]>([
    {
      id: 'USR001',
      fullName: 'John Doe',
      username: 'johndoe',
      email: 'john.doe@example.com',
      package: 'Gold',
      status: 'Active',
      registrationDate: new Date('2024-01-15')
    },
    {
      id: 'USR002',
      fullName: 'Jane Smith',
      username: 'janesmith',
      email: 'jane.smith@example.com',
      package: 'Platinum',
      status: 'Active',
      registrationDate: new Date('2024-02-20')
    },
    {
      id: 'USR003',
      fullName: 'Bob Johnson',
      username: 'bobjohnson',
      email: 'bob.johnson@example.com',
      package: 'Silver',
      status: 'Suspended',
      registrationDate: new Date('2024-03-10')
    }
  ]);

  actions = signal<TableAction<User>[]>([
    {
      icon: 'pi pi-eye',
      tooltip: 'View Profile',
      severity: 'secondary',
      command: (user) => console.log('View user:', user)
    },
    {
      icon: 'pi pi-pencil',
      tooltip: 'Edit',
      severity: 'primary',
      command: (user) => console.log('Edit user:', user)
    },
    {
      icon: 'pi pi-ban',
      tooltip: 'Suspend',
      severity: 'danger',
      visible: (user) => user.status === 'Active',
      command: (user) => console.log('Suspend user:', user)
    },
    {
      icon: 'pi pi-check',
      tooltip: 'Activate',
      severity: 'success',
      visible: (user) => user.status === 'Suspended',
      command: (user) => console.log('Activate user:', user)
    }
  ]);

  ngAfterViewInit(): void {
    // Set columns after view init to access template references
    this.columns.set([
      {
        field: 'id',
        header: 'ID',
        width: '100px',
        sortable: true,
        align: 'center'
      },
      {
        field: 'fullName',
        header: 'User',
        template: this.userCellTemplate,
        sortable: true
      },
      {
        field: 'email',
        header: 'Email',
        sortable: true
      },
      {
        field: 'package',
        header: 'Package',
        template: this.packageCellTemplate,
        width: '120px',
        align: 'center',
        sortable: true
      },
      {
        field: 'status',
        header: 'Status',
        template: this.statusCellTemplate,
        width: '120px',
        align: 'center',
        sortable: true
      },
      {
        field: 'registrationDate',
        header: 'Joined',
        width: '150px',
        align: 'center',
        sortable: true,
        formatter: (value) => new Date(value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }
    ]);
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
