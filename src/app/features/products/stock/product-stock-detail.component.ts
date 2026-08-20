import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TablePageEvent } from 'primeng/table';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import {
  AdminStockDetailResponse,
  AdminStockMovementRow,
  AdminStockService,
  StockMovementType,
} from '../services/admin-stock.service';
import { StockRefreshService } from '../services/stock-refresh.service';

interface MovementOption {
  label: string;
  value: StockMovementType | null;
}

@Component({
  selector: 'app-product-stock-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ButtonModule, SelectModule, DataTableComponent],
  templateUrl: './product-stock-detail.component.html',
  styleUrls: ['./product-stock-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductStockDetailComponent implements OnInit {
  private readonly stockApi = inject(AdminStockService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly stockRefresh = inject(StockRefreshService);
  private readonly destroyRef = inject(DestroyRef);

  detail = signal<AdminStockDetailResponse | null>(null);
  movements = signal<AdminStockMovementRow[]>([]);

  loadingDetail = signal(false);
  loadingMovements = signal(false);
  loadError = signal<string | null>(null);

  movementType = signal<StockMovementType | null>(null);
  movementOptions: MovementOption[] = [
    { label: 'All types', value: null },
    { label: 'Allocation accept', value: 'ALLOCATION_ACCEPT' },
    { label: 'Order pickup', value: 'ORDER_PICKUP' },
    { label: 'Order merchant assign', value: 'ORDER_MERCHANT_ASSIGN' },
    { label: 'Admin home delivery approve', value: 'ADMIN_HOME_DELIVERY_APPROVE' },
    { label: 'Manual pool set', value: 'MANUAL_POOL_SET' },
    { label: 'Manual merchant adjust', value: 'MANUAL_MERCHANT_ADJUST' },
  ];

  totalMovements = signal(0);
  movementFirst = signal(0);
  movementRows = signal(50);

  summaryCards = computed(() => {
    const data = this.detail();
    return [
      { label: 'On hand total', value: data?.onHandTotal ?? 0 },
      { label: 'Warehouse remaining', value: data?.warehouseRemaining ?? 0 },
      { label: 'Merchant stock remaining', value: data?.merchantStockRemaining ?? 0 },
      { label: 'Delivered to merchants', value: data?.deliveredToMerchants ?? 0 },
      { label: 'Total ordered', value: data?.totalOrdered ?? 0 },
      { label: 'Delivered to users', value: data?.deliveredToUsers ?? 0 },
    ];
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/admin/products/stock']);
      return;
    }
    this.loadDetail(id);
    this.loadMovements(id);
    this.stockRefresh.refresh$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((productIds) => {
        if (productIds.includes(id)) {
          this.loadDetail(id);
          this.loadMovements(id);
        }
      });
  }

  private loadDetail(productId: string): void {
    this.loadingDetail.set(true);
    this.loadError.set(null);
    this.stockApi.getStockDetail(productId).subscribe({
      next: (res) => {
        this.loadingDetail.set(false);
        if (!res) {
          this.loadError.set('Failed to load stock detail.');
          this.detail.set(null);
          return;
        }
        this.detail.set(res);
      },
      error: () => {
        this.loadingDetail.set(false);
        this.loadError.set('Failed to load stock detail.');
        this.detail.set(null);
      },
    });
  }

  loadMovements(productId?: string): void {
    const id = productId ?? this.detail()?.productId;
    if (!id) return;
    this.loadingMovements.set(true);
    this.stockApi.getStockMovements(id, {
      type: this.movementType() ?? undefined,
      limit: this.movementRows(),
      offset: this.movementFirst(),
    }).subscribe({
      next: (res) => {
        this.loadingMovements.set(false);
        if (!res) {
          this.loadError.set('Failed to load movement history.');
          this.movements.set([]);
          this.totalMovements.set(0);
          return;
        }
        this.movements.set(res.items ?? []);
        this.totalMovements.set(res.total ?? 0);
      },
      error: () => {
        this.loadingMovements.set(false);
        this.loadError.set('Failed to load movement history.');
        this.movements.set([]);
        this.totalMovements.set(0);
      },
    });
  }

  onMovementTypeChange(value: StockMovementType | null): void {
    this.movementType.set(value);
    this.movementFirst.set(0);
    this.loadMovements();
  }

  onMovementPageChange(event: TablePageEvent): void {
    this.movementFirst.set(event.first);
    this.movementRows.set(event.rows);
    this.loadMovements();
  }

  onBack(): void {
    this.router.navigate(['/admin/products/stock']);
  }

  onAdjustWarehouse(): void {
    const id = this.detail()?.productId;
    if (!id) return;
    this.router.navigate(['/admin/products', id, 'edit']);
  }

  formatType(value: string): string {
    return value.replace(/_/g, ' ');
  }

  private truncateId(id: string | null | undefined): string {
    if (!id) return '';
    return id.length > 8 ? `${id.slice(0, 8)}…` : id;
  }

  orderId(row: AdminStockMovementRow): string | null {
    return row.orderId || row.metadata?.orderId || null;
  }

  merchantId(row: AdminStockMovementRow): string | null {
    return row.merchantId || row.metadata?.merchantId || null;
  }

  actorId(row: AdminStockMovementRow): string | null {
    return row.actorId || row.metadata?.actorId || null;
  }

  orderLabel(row: AdminStockMovementRow): string {
    const name = row.metadata?.orderName?.trim();
    if (name) return name;
    return this.truncateId(this.orderId(row));
  }

  merchantLabel(row: AdminStockMovementRow): string {
    const business = row.metadata?.businessName?.trim();
    if (business) return business;
    const merchantName = row.metadata?.merchantName?.trim();
    if (merchantName) return merchantName;
    return this.truncateId(this.merchantId(row));
  }

  merchantSecondaryLabel(row: AdminStockMovementRow): string | null {
    const business = row.metadata?.businessName?.trim();
    const merchantName = row.metadata?.merchantName?.trim();
    if (business && merchantName && business !== merchantName) {
      return merchantName;
    }
    return null;
  }

  actorLabel(row: AdminStockMovementRow): string {
    const name = row.metadata?.actorName?.trim();
    if (name) return name;
    return this.truncateId(this.actorId(row));
  }
}
