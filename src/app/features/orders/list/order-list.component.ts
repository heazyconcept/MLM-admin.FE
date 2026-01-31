import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

// App
import { OrderService } from '../../../core/services/order.service';
import { Order, OrderStatus } from '../../../core/models/order.model';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { DataTableTemplateDirective } from '../../../shared/components/data-table/data-table-template.directive';
import { TableColumn, TableConfig, TableAction } from '../../../shared/components/data-table/data-table.types';

@Component({
  selector: 'app-order-list',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    IconFieldModule,
    InputIconModule,
    DataTableComponent,
    DataTableTemplateDirective
  ],
  templateUrl: './order-list.component.html',
  styleUrls: ['./order-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderListComponent {
  private orderService = inject(OrderService);
  private router = inject(Router);

  // State
  orders = this.orderService.orders;
  
  searchQueryControl = new FormControl('');
  selectedStatusControl = new FormControl<OrderStatus | null>(null);
  selectedFulfilmentControl = new FormControl<string | null>(null);

  // Options
  statusOptions = [
    { label: 'All Statuses', value: null },
    { label: 'Pending', value: 'Pending' },
    { label: 'Processing', value: 'Processing' },
    { label: 'Ready', value: 'Ready' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Cancelled', value: 'Cancelled' },
    { label: 'Delayed', value: 'Delayed' },
    { label: 'Failed', value: 'Failed' }
  ];

  fulfilmentOptions = [
    { label: 'All Types', value: null },
    { label: 'Pickup', value: 'Pickup' },
    { label: 'Delivery', value: 'Delivery' }
  ];

  // Filtering
  filteredOrders = computed(() => {
    let list = this.orders();
    const search = (this.searchQueryControl.value || '').toLowerCase();
    const status = this.selectedStatusControl.value;
    const fulfilment = this.selectedFulfilmentControl.value;

    // Search
    if (search) {
      list = list.filter(o => 
        o.id.toLowerCase().includes(search) ||
        o.user.name.toLowerCase().includes(search) ||
        o.items.some(i => i.name.toLowerCase().includes(search))
      );
    }

    // Status Filter
    if (status) {
      list = list.filter(o => o.status === status);
    }

    // Fulfilment Filter
    if (fulfilment) {
      list = list.filter(o => o.fulfilmentType === fulfilment);
    }

    return list;
  });

  // Table Configuration
  columns = signal<TableColumn<Order>[]>([
    { field: 'id', header: 'Order ID', width: '120px', class: 'font-mono text-xs' },
    { field: 'user', header: 'Customer' },
    { field: 'totalAmount', header: 'Amount' },
    { field: 'fulfilmentType', header: 'Fulfilment' },
    { field: 'status', header: 'Status' },
    { field: 'createdAt', header: 'Date', width: '120px' }
  ]);

  tableConfig = signal<TableConfig>({
    paginator: true,
    rows: 10,
    showCurrentPageReport: true,
    rowsPerPageOptions: [10, 20, 50],
    size: 'small',
    hoverable: true
  });

  actions = signal<TableAction<Order>[]>([
    {
      icon: 'pi pi-eye',
      tooltip: 'View Details',
      severity: 'secondary',
      command: (order) => this.router.navigate(['/admin/orders', order.id])
    }
  ]);

  getStatusSeverity(status: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | undefined {
    switch (status) {
      case 'Completed': return 'success';
      case 'Ready': return 'info';
      case 'Processing': return 'info'; // or undefined
      case 'Pending': return 'secondary';
      case 'Delayed': return 'warn';
      case 'Failed':
      case 'Cancelled': return 'danger';
      default: return 'secondary';
    }
  }
}
