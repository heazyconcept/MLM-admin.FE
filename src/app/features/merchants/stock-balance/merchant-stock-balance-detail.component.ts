import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import {
  MerchantStockBalanceDetail,
  MerchantStockBalanceService,
  MerchantStockProductItem,
} from '../services/merchant-stock-balance.service';

@Component({
  selector: 'app-merchant-stock-balance-detail',
  imports: [CommonModule, RouterModule, ButtonModule, DataTableComponent],
  templateUrl: './merchant-stock-balance-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MerchantStockBalanceDetailComponent implements OnInit {
  private readonly stockBalanceService = inject(MerchantStockBalanceService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  detail = signal<MerchantStockBalanceDetail | null>(null);
  loading = signal(false);
  loadError = signal<string | null>(null);

  merchantId = signal('');

  summaryCards = computed(() => {
    const d = this.detail();
    const totals = d?.totals;
    return [
      { label: 'Total allocated', value: totals?.totalAllocated ?? 0 },
      { label: 'Total fulfilled', value: totals?.totalFulfilled ?? 0 },
      { label: 'Current balance', value: totals?.currentBalance ?? 0 },
      { label: 'Products', value: totals?.productCount ?? 0 },
    ];
  });

  categoryHeaders = signal([
    'Category',
    'Products',
    'Allocated',
    'Fulfilled',
    'Balance',
  ]);

  productHeaders = signal([
    'Product',
    'Category',
    'Allocated',
    'Fulfilled',
    'Balance',
    'Authorized',
    'Reported',
  ]);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('merchantId');
    if (!id) {
      this.router.navigate(['/admin/merchants/stock-balance']);
      return;
    }
    this.merchantId.set(id);
    this.loadDetail(id);
  }

  loadDetail(merchantId: string): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.stockBalanceService.getMerchantStockBalance(merchantId).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (!res) {
          this.loadError.set('Failed to load merchant stock balance.');
          this.detail.set(null);
          return;
        }
        this.detail.set(res);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('Failed to load merchant stock balance.');
        this.detail.set(null);
      },
    });
  }

  onBack(): void {
    this.router.navigate(['/admin/merchants/stock-balance']);
  }

  onRefresh(): void {
    const id = this.merchantId();
    if (id) this.loadDetail(id);
  }

  formatType(type: string): string {
    if (!type) return '—';
    return type
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');
  }

  hasQuantityMismatch(item: MerchantStockProductItem): boolean {
    return item.authorizedQuantity !== item.stockQuantity;
  }
}
