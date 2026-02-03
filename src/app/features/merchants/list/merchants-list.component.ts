import { Component, inject, computed, signal, ChangeDetectionStrategy, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MerchantService, Merchant, MerchantStatus, MerchantType } from '../services/merchant.service';
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

interface TypeOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-merchants-list',
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
  templateUrl: './merchants-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MerchantsListComponent implements OnInit {
  private merchantService = inject(MerchantService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @ViewChild('status', { static: true }) statusTemplate!: TemplateRef<unknown>;

  merchants = this.merchantService.merchants;
  
  selectedStatusControl = new FormControl('all');
  selectedTypeControl = new FormControl('all');
  searchQuery = signal<string>('');

  statusOptions: StatusOption[] = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Suspended', value: 'Suspended' }
  ];

  typeOptions: TypeOption[] = [
    { label: 'All Types', value: 'all' },
    { label: 'Regional', value: 'Regional' },
    { label: 'National', value: 'National' },
    { label: 'Global', value: 'Global' }
  ];

  filteredMerchants = computed(() => {
    let merchants = this.merchantService.merchants();
    
    if (this.selectedStatusControl.value !== 'all') {
      merchants = merchants.filter((m: Merchant) => m.status === this.selectedStatusControl.value);
    }

    if (this.selectedTypeControl.value !== 'all') {
      merchants = merchants.filter((m: Merchant) => m.type === this.selectedTypeControl.value);
    }
    
    const query = this.searchQuery().toLowerCase();
    if (query) {
      merchants = merchants.filter((m: Merchant) => 
        m.businessName.toLowerCase().includes(query) ||
        m.ownerName.toLowerCase().includes(query) ||
        m.id.toLowerCase().includes(query)
      );
    }
    
    return merchants;
  });

  stats = computed(() => {
    const all = this.merchantService.merchants();
    
    return {
      total: all.length,
      pending: this.merchantService.pendingCount(),
      approved: this.merchantService.approvedCount(),
      suspended: this.merchantService.suspendedCount()
    };
  });

  columns = signal<TableColumn<Merchant>[]>([]);
  
  tableConfig = signal<TableConfig>({
    paginator: true,
    rows: 10,
    globalFilter: false,
    showGridlines: false,
    hoverable: true,
    size: 'normal'
  });

  actions = signal<TableAction<Merchant>[]>([
    {
      icon: 'pi pi-eye',
      tooltip: 'View Details',
      severity: 'secondary',
      command: (merchant) => this.viewDetails(merchant)
    }
  ]);

  ngOnInit() {
    // Check if we should filter by default (from route data or query params)
    const defaultFilter = this.route.snapshot.data['defaultFilter'];
    const statusParam = this.route.snapshot.queryParamMap.get('status');
    
    if (statusParam) {
      this.selectedStatusControl.setValue(statusParam);
    } else if (defaultFilter) {
      this.selectedStatusControl.setValue(defaultFilter);
    }

    this.columns.set([
      {
        field: 'id',
        header: 'Merchant ID',
        width: '120px',
        sortable: true
      },
      {
        field: 'businessName',
        header: 'Business Name',
        sortable: true
      },
      {
        field: 'ownerName',
        header: 'Owner',
        width: '180px',
        sortable: true
      },
      {
        field: 'type',
        header: 'Merchant Type',
        width: '130px',
        sortable: true,
        align: 'center'
      },
      {
        field: 'region',
        header: 'Region',
        width: '200px',
        formatter: (value: unknown) => {
          const regions = value as string[];
          if (!regions || regions.length === 0) return 'N/A';
          if (regions.length === 1) return regions[0];
          return `${regions[0]} +${regions.length - 1}`;
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
        field: 'assignedProductIds',
        header: 'Assigned Products',
        width: '150px',
        align: 'center',
        formatter: (value: unknown) => {
          const products = value as string[];
          return products.length.toString();
        }
      }
    ]);
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

  getStatusSeverity(status: MerchantStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'Approved': return 'success';
      case 'Pending': return 'warn';
      case 'Suspended': return 'danger';
      default: return 'info';
    }
  }
}
