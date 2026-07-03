import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DatePickerModule } from 'primeng/datepicker';

// App
import { AdminOrdersService } from '../services/admin-orders.service';
import { Order, OrderStatus, FulfilmentMode, CustomerType, AdminOrderFilters } from '../../../core/models/order.model';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';

@Component({
  selector: 'app-order-list',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    IconFieldModule,
    InputIconModule,
    DatePickerModule,
    DataTableComponent,
  ],
  templateUrl: './order-list.component.html',
  styleUrls: ['./order-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderListComponent implements OnInit {
  private ordersService = inject(AdminOrdersService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // State from service
  orders = this.ordersService.orders;
  loading = this.ordersService.loading;
  loadError = this.ordersService.error;
  listTotal = this.ordersService.listTotal;

  // Filter controls
  searchQuery = signal('');
  searchVal = signal('');
  selectedStatusControl = new FormControl<string>('all');
  selectedFulfilmentControl = new FormControl<string>('all');
  selectedCustomerTypeControl = new FormControl<string>('all');
  fromDateControl = new FormControl<Date | null>(null);
  toDateControl = new FormControl<Date | null>(null);

  // Options
  statusOptions = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Created', value: 'CREATED' },
    { label: 'Paid', value: 'PAID' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Assigned to Merchant', value: 'ASSIGNED_TO_MERCHANT' },
    { label: 'Ready for Pickup', value: 'READY_FOR_PICKUP' },
    { label: 'Picked Up', value: 'PICKED_UP' },
    { label: 'Delivery Requested', value: 'OFFLINE_DELIVERY_REQUESTED' },
    { label: 'Fulfilled', value: 'FULFILLED' },
    { label: 'Delivered', value: 'DELIVERED' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
    { label: 'Failed', value: 'FAILED' },
  ];

  fulfilmentOptions = [
    { label: 'All Types', value: 'all' },
    { label: 'Pickup', value: 'PICKUP' },
    { label: 'Offline Delivery', value: 'OFFLINE_DELIVERY' },
  ];

  customerTypeOptions = [
    { label: 'All Customers', value: 'all' },
    { label: 'Member', value: 'MEMBER' },
    { label: 'Non-member', value: 'NON_MEMBER' },
  ];

  filteredOrders = computed(() => {
    return this.orders();
  });

  // Table config
  tableHeaders = signal<string[]>([
    'Customer',
    'Amount',
    'Fulfilment',
    'Batch',
    'Customer Type',
    'Status',
    'Date',
    'Actions',
  ]);

  ngOnInit(): void {
    this.loadOrders();

    // Re-fetch when filters change
    this.selectedStatusControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadOrders());

    this.selectedFulfilmentControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadOrders());

    this.selectedCustomerTypeControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadOrders());
  }

  loadOrders(): void {
    const filters = this.buildFilters();
    this.ordersService.loadOrders(filters).subscribe();
  }

  onDateFilter(): void {
    this.loadOrders();
  }

  onSearch(): void {
    this.searchQuery.set(this.searchVal().trim());
    this.loadOrders();
  }

  onRefresh(): void {
    this.loadOrders();
  }

  viewOrder(order: Order): void {
    this.router.navigate(['/admin/orders', order.id]);
  }

  // Delegate display helpers to the service
  getStatusLabel(status: OrderStatus): string {
    return this.ordersService.getStatusLabel(status);
  }

  getStatusSeverity(status: OrderStatus) {
    return this.ordersService.getStatusSeverity(status);
  }

  getFulfilmentLabel(mode: FulfilmentMode): string {
    return this.ordersService.getFulfilmentLabel(mode);
  }

  getCustomerTypeLabel(type: CustomerType): string {
    return this.ordersService.getCustomerTypeLabel(type);
  }

  getOrderCustomerName(order: Order): string {
    return this.ordersService.getOrderCustomerName(order);
  }

  getOrderCustomerEmail(order: Order): string {
    return this.ordersService.getOrderCustomerEmail(order);
  }

  getOrderCustomerUsername(order: Order): string {
    return this.ordersService.getOrderCustomerUsername(order);
  }

  private buildFilters(): AdminOrderFilters {
    const filters: AdminOrderFilters = { limit: 100, offset: 0 };

    const status = this.selectedStatusControl.value;
    if (status && status !== 'all') filters.status = status as OrderStatus;

    const fulfilment = this.selectedFulfilmentControl.value;
    if (fulfilment && fulfilment !== 'all') filters.fulfilmentMode = fulfilment as FulfilmentMode;

    const customerType = this.selectedCustomerTypeControl.value;
    if (customerType && customerType !== 'all') filters.customerType = customerType as CustomerType;

    const from = this.fromDateControl.value;
    if (from) filters.fromDate = from.toISOString();

    const to = this.toDateControl.value;
    if (to) filters.toDate = to.toISOString();

    const search = this.searchQuery();
    if (search) filters.search = search;

    return filters;
  }
}
