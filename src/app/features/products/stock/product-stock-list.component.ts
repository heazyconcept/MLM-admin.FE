import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TablePageEvent } from 'primeng/table';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { AdminProductsService } from '../services/admin-products.service';
import { AdminStockService, AdminStockProductRow } from '../services/admin-stock.service';
import { StockRefreshService } from '../services/stock-refresh.service';

@Component({
  selector: 'app-product-stock-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    SelectModule,
    ButtonModule,
    DataTableComponent,
  ],
  templateUrl: './product-stock-list.component.html',
  styleUrls: ['./product-stock-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductStockListComponent implements OnInit {
  private readonly stockApi = inject(AdminStockService);
  private readonly adminProducts = inject(AdminProductsService);
  private readonly router = inject(Router);
  private readonly stockRefresh = inject(StockRefreshService);
  private readonly destroyRef = inject(DestroyRef);

  items = signal<AdminStockProductRow[]>([]);
  loading = signal(false);
  loadError = signal<string | null>(null);

  totalRecords = signal(0);
  tableFirst = signal(0);
  rows = signal(50);

  searchQuery = signal('');
  private appliedSearch = signal('');
  selectedCategory = signal<string | null>(null);

  categoryOptions = computed(() => [
    { label: 'All categories', value: null },
    ...this.adminProducts.categories().map((c) => ({ label: c.name, value: c.id }))
  ]);

  tableHeaders = signal([
    'Product',
    'SKU',
    'On hand',
    'Warehouse',
    'Merchant stock',
    'Delivered to merchants',
    'Total ordered',
    'Delivered to users',
  ]);

  ngOnInit(): void {
    this.adminProducts.loadCategories().subscribe();
    this.loadStock();
    this.stockRefresh.refresh$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadStock());
  }

  loadStock(): void {
    this.loading.set(true);
    this.loadError.set(null);
    const query = this.appliedSearch().trim();
    this.stockApi
      .getStockList({
        categoryId: this.selectedCategory() ?? undefined,
        search: query || undefined,
        limit: this.rows(),
        offset: this.tableFirst(),
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (!res) {
            this.loadError.set('Failed to load stock list.');
            this.items.set([]);
            this.totalRecords.set(0);
            return;
          }
          this.items.set(res.items ?? []);
          this.totalRecords.set(res.total ?? 0);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set('Failed to load stock list.');
          this.items.set([]);
          this.totalRecords.set(0);
        },
      });
  }

  onSearch(): void {
    this.appliedSearch.set(this.searchQuery().trim());
    this.tableFirst.set(0);
    this.loadStock();
  }

  onCategoryChange(value: string | null): void {
    this.selectedCategory.set(value);
    this.tableFirst.set(0);
    this.loadStock();
  }

  onPageChange(event: TablePageEvent): void {
    this.tableFirst.set(event.first);
    this.rows.set(event.rows);
    this.loadStock();
  }

  onRefresh(): void {
    this.loadStock();
  }

  viewDetail(row: AdminStockProductRow): void {
    this.router.navigate(['/admin/products/stock', row.productId]);
  }
}
