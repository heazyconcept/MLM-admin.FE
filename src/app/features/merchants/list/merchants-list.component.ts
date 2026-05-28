import { Component, inject, computed, signal, ChangeDetectionStrategy, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MerchantService, Merchant, MerchantStatus, MerchantType, AdminMerchantFilters } from '../services/merchant.service';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ButtonModule } from 'primeng/button';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface FilterOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-merchants-list',
  imports: [
    CommonModule,
    RouterModule,
    DataTableComponent,
    StatusBadgeComponent,
    ButtonModule,
    ReactiveFormsModule
  ],
  templateUrl: './merchants-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MerchantsListComponent implements OnInit {
  private merchantService = inject(MerchantService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  merchants = this.merchantService.merchants;
  loading = this.merchantService.loading;
  loadingError = this.merchantService.loadingError;
  listTotal = this.merchantService.listTotal;

  selectedStatusControl = new FormControl<string>('all');
  selectedTypeControl = new FormControl<string>('all');
  searchQuery = signal<string>('');

  statusOptions: FilterOption[] = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Suspended', value: 'SUSPENDED' }
  ];

  typeOptions: FilterOption[] = [
    { label: 'All Types', value: 'all' },
    { label: 'Pickup Point', value: 'PICKUP_POINT' },
    { label: 'Delivery Partner', value: 'DELIVERY_PARTNER' }
  ];

  tableHeaders = signal<string[]>([
    'Merchant ID', 'Username', 'Type', 'Service Areas', 'Products', 'Status', 'Actions'
  ]);

  /** Client-side search filter applied on top of API-filtered list */
  filteredMerchants = computed(() => {
    let merchants = this.merchantService.merchants();
    const query = this.searchQuery().toLowerCase();
    if (query) {
      merchants = merchants.filter((m: Merchant) =>
        this.merchantService.getMerchantDisplayName(m).toLowerCase().includes(query) ||
        m.user?.email?.toLowerCase().includes(query) ||
        m.id.toLowerCase().includes(query)
      );
    }
    return merchants;
  });

  stats = computed(() => ({
    total: this.merchantService.listTotal(),
    pending: this.merchantService.pendingCount(),
    active: this.merchantService.activeCount(),
    suspended: this.merchantService.suspendedCount()
  }));

  private buildFilters(): AdminMerchantFilters {
    const status = this.selectedStatusControl.value;
    const type = this.selectedTypeControl.value;
    const filters: AdminMerchantFilters = { limit: 500, offset: 0 };
    if (status && status !== 'all') {
      filters.status = status as MerchantStatus;
    }
    if (type && type !== 'all') {
      filters.type = type as MerchantType;
    }
    return filters;
  }

  loadMerchants(): void {
    this.merchantService.loadMerchants(this.buildFilters()).subscribe();
  }

  ngOnInit() {
    const statusParam = this.route.snapshot.queryParamMap.get('status');
    if (statusParam) {
      this.selectedStatusControl.setValue(statusParam);
    }

    this.loadMerchants();

    this.selectedStatusControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadMerchants());

    this.selectedTypeControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadMerchants());
  }

  viewDetails(merchant: Merchant) {
    this.router.navigate(['/admin/merchants', merchant.id]);
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  onExport() {
    console.log('Export merchants');
  }

  getDisplayName(merchant: Merchant): string {
    return this.merchantService.getMerchantDisplayName(merchant);
  }

  getDisplayStatus(status: MerchantStatus): 'Pending' | 'Active' | 'Suspended' {
    return this.merchantService.getDisplayStatus(status);
  }

  getDisplayType(type: MerchantType): string {
    return this.merchantService.getDisplayType(type);
  }

  formatServiceAreas(areas: string[]): string {
    if (!areas || areas.length === 0) return 'N/A';
    if (areas.length === 1) return areas[0];
    return `${areas[0]} +${areas.length - 1}`;
  }
}
