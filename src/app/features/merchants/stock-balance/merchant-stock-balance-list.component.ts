import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { TablePageEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import {
  MerchantStockBalanceRow,
  MerchantStockBalanceService,
} from '../services/merchant-stock-balance.service';

interface FilterOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-merchant-stock-balance-list',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    DataTableComponent,
  ],
  templateUrl: './merchant-stock-balance-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MerchantStockBalanceListComponent implements OnInit {
  private readonly stockBalanceService = inject(MerchantStockBalanceService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  items = signal<MerchantStockBalanceRow[]>([]);
  loading = signal(false);
  loadError = signal<string | null>(null);

  totalRecords = signal(0);
  tableFirst = signal(0);
  rows = signal(20);

  selectedStatusControl = new FormControl<string>('all');
  selectedTypeControl = new FormControl<string>('all');

  statusOptions: FilterOption[] = [
    { label: 'All statuses', value: 'all' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Suspended', value: 'SUSPENDED' },
  ];

  typeOptions: FilterOption[] = [
    { label: 'All types', value: 'all' },
    { label: 'Regional', value: 'REGIONAL' },
    { label: 'National', value: 'NATIONAL' },
    { label: 'Global', value: 'GLOBAL' },
    { label: 'Pickup Point', value: 'PICKUP_POINT' },
    { label: 'Delivery Partner', value: 'DELIVERY_PARTNER' },
  ];

  tableHeaders = signal([
    'Merchant',
    'Type',
    'Products',
    'Allocated',
    'Fulfilled',
    'Balance',
    'Actions',
  ]);

  ngOnInit(): void {
    this.loadList();

    this.selectedStatusControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.tableFirst.set(0);
        this.loadList();
      });

    this.selectedTypeControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.tableFirst.set(0);
        this.loadList();
      });
  }

  loadList(): void {
    this.loading.set(true);
    this.loadError.set(null);

    const status = this.selectedStatusControl.value;
    const merchantType = this.selectedTypeControl.value;

    this.stockBalanceService
      .getStockBalanceList({
        status: status && status !== 'all' ? status : undefined,
        merchantType: merchantType && merchantType !== 'all' ? merchantType : undefined,
        limit: this.rows(),
        offset: this.tableFirst(),
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (!res) {
            this.loadError.set('Failed to load merchant stock balance.');
            this.items.set([]);
            this.totalRecords.set(0);
            return;
          }
          this.items.set(res.merchants);
          this.totalRecords.set(res.total);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set('Failed to load merchant stock balance.');
          this.items.set([]);
          this.totalRecords.set(0);
        },
      });
  }

  onPageChange(event: TablePageEvent): void {
    this.tableFirst.set(event.first);
    this.rows.set(event.rows);
    this.loadList();
  }

  onRefresh(): void {
    this.loadList();
  }

  viewDetail(row: MerchantStockBalanceRow): void {
    this.router.navigate(['/admin/merchants/stock-balance', row.merchantId]);
  }

  formatType(type: string): string {
    if (!type) return '—';
    return type
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');
  }
}
