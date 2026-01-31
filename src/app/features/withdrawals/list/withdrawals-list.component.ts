import { Component, inject, computed, signal, ChangeDetectionStrategy, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { WithdrawalService, WithdrawalRequest, WithdrawalStatus } from '../services/withdrawal.service';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { DataTableTemplateDirective } from '../../../shared/components/data-table/data-table-template.directive';
import { TableColumn, TableConfig, TableAction } from '../../../shared/components/data-table/data-table.types';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

interface StatusOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-withdrawals-list',
  imports: [
    CommonModule,
    RouterModule,
    DataTableComponent,
    DataTableTemplateDirective,
    StatusBadgeComponent,
    SelectModule,
    ButtonModule,
    InputTextModule,
    ReactiveFormsModule
  ],
  templateUrl: './withdrawals-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WithdrawalsListComponent implements OnInit {
  private withdrawalService = inject(WithdrawalService);
  private route = inject(ActivatedRoute);

  @ViewChild('status', { static: true }) statusTemplate!: TemplateRef<unknown>;

  withdrawals = this.withdrawalService.withdrawals;
  
  selectedStatusControl = new FormControl('all');
  searchQuery = signal<string>('');

  statusOptions: StatusOption[] = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Rejected', value: 'Rejected' },
    { label: 'Processing', value: 'Processing' },
    { label: 'Paid', value: 'Paid' }
  ];

  filteredWithdrawals = computed(() => {
    let requests = this.withdrawalService.withdrawals();
    
    if (this.selectedStatusControl.value !== 'all') {
      requests = requests.filter(r => r.status === this.selectedStatusControl.value);
    }
    
    const query = this.searchQuery().toLowerCase();
    if (query) {
      requests = requests.filter(r => 
        r.userName.toLowerCase().includes(query) ||
        r.id.toLowerCase().includes(query) ||
        r.userEmail.toLowerCase().includes(query)
      );
    }
    
    return requests;
  });

  stats = computed(() => {
    const all = this.withdrawalService.withdrawals();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return {
      totalPending: all.filter(w => w.status === 'Pending').length,
      approvedToday: all.filter(w => {
        if (w.status !== 'Approved' || !w.processedDate) return false;
        const processedDate = new Date(w.processedDate);
        processedDate.setHours(0, 0, 0, 0);
        return processedDate.getTime() === today.getTime();
      }).length,
      totalAmount: all.reduce((sum, w) => sum + w.amount, 0)
    };
  });

  columns = signal<TableColumn<WithdrawalRequest>[]>([]);
  
  tableConfig = signal<TableConfig>({
    paginator: true,
    rows: 10,
    globalFilter: false,
    showGridlines: false,
    hoverable: true,
    size: 'normal'
  });

  actions = signal<TableAction<WithdrawalRequest>[]>([
    {
      icon: 'pi pi-eye',
      tooltip: 'View Details',
      severity: 'secondary',
      command: (withdrawal) => this.viewDetails(withdrawal)
    }
  ]);

  ngOnInit() {
    // Check if we should filter by default (from route data)
    const defaultFilter = this.route.snapshot.data['defaultFilter'];
    if (defaultFilter) {
      this.selectedStatusControl.setValue(defaultFilter);
    }

    this.columns.set([
      {
        field: 'id',
        header: 'Request ID',
        width: '120px',
        sortable: true
      },
      {
        field: 'userName',
        header: 'User',
        sortable: true
      },
      {
        field: 'amount',
        header: 'Amount',
        width: '150px',
        sortable: true,
        align: 'right',
        formatter: (value: unknown, row: WithdrawalRequest) => `${row.currency} ${Number(value).toLocaleString()}`
      },
      {   
        field: 'destination',
        header: 'Destination',
        width: '200px',
        formatter: (value: unknown) => {
          const s = String(value ?? '');
          return s.length > 30 ? s.substring(0, 30) + '...' : s;
        }
      },
      {
        field: 'status',
        header: 'Status',
        width: '120px',
        align: 'center',
        template: this.statusTemplate
      },
      {
        field: 'requestDate',
        header: 'Request Date',
        width: '140px',
        sortable: true,
        formatter: (value: unknown) => new Date(value as string | number | Date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }
    ]);
  }

  private router = inject(Router);

  viewDetails(withdrawal: WithdrawalRequest) {
    this.router.navigate(['/admin/withdrawals', withdrawal.id]);
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  onExport() {
    console.log('Export withdrawals');
  }

  getStatusSeverity(status: WithdrawalStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'Paid': return 'success';
      case 'Approved': return 'info';
      case 'Pending': return 'warn';
      case 'Rejected': return 'danger';
      case 'Processing': return 'secondary';
      default: return 'info';
    }
  }
}
