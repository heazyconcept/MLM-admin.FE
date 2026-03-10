import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminProductsService } from '../services/admin-products.service';
import { Product, ProductStatus } from '../../../core/models/product.model';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductDrawerComponent } from '../modals/product-drawer.component';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { TableConfig } from '../../../shared/components/data-table/data-table.types';

@Component({
  selector: 'app-product-list',
  imports: [
    CommonModule, 
    TableModule, 
    ButtonModule, 
    InputTextModule, 
    SelectModule, 
    TagModule,
    IconFieldModule,
    InputIconModule,
    FormsModule,
    ProductDrawerComponent,
    ToastModule,
    TooltipModule,
    DataTableComponent,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductListComponent implements OnInit {
  private adminProducts = inject(AdminProductsService);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // State: use API-backed list when available
  products = this.adminProducts.products;
  categories = this.adminProducts.categories;
  loadingProducts = this.adminProducts.loadingProducts;
  loadingCategories = this.adminProducts.loadingCategories;
  loadError = this.adminProducts.error;
  
  searchQuery = signal('');
  selectedCategory = signal<string | null>(null);
  selectedStatus = signal<ProductStatus | null>(null);
  showDrawer = signal(false);

  statusOptions = [
    { label: 'All Statuses', value: null },
    { label: 'Draft', value: 'DRAFT' as ProductStatus },
    { label: 'Active', value: 'ACTIVE' as ProductStatus },
    { label: 'Inactive', value: 'INACTIVE' as ProductStatus }
  ];

  categoryOptions = computed(() => [
    { label: 'All Categories', value: null },
    ...this.categories().map(c => ({ label: c.name, value: c.id }))
  ]);

  filteredProducts = computed(() => {
    let list = this.products();
    const search = this.searchQuery().toLowerCase();
    const cat = this.selectedCategory();
    const status = this.selectedStatus();

    if (search) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(search) ||
        (p.sku && p.sku.toLowerCase().includes(search))
      );
    }

    if (cat) {
      list = list.filter(p => p.categoryId === cat);
    }

    if (status) {
      list = list.filter(p => p.status === status);
    }

    return list;
  });

  ngOnInit(): void {
    this.adminProducts.loadCategories().subscribe();
    this.adminProducts.loadProducts({ limit: 100, offset: 0 }).subscribe();
  }

  onRefresh(): void {
    this.adminProducts.loadCategories().subscribe();
    this.adminProducts.loadProducts({ limit: 100, offset: 0 }).subscribe();
  }

  tableConfig = signal<TableConfig>({
    paginator: true,
    rows: 10,
    rowsPerPageOptions: [10, 25, 50],
    showCurrentPageReport: true,
    currentPageReportTemplate: 'Showing {first} to {last} of {totalRecords} products',
    showGridlines: true,
    hoverable: true,
    size: 'small'
  });

  tableHeaders = signal<string[]>(['Image', 'Product Info', 'Category', 'Base Price', 'Non-member Price', 'PV', 'CPV', 'Admin Pool', 'Status', 'Visibility', 'Actions']);

  tableRows = signal(10);
  tableRowsPerPageOptions = signal([10, 25, 50]);

  onAddProduct() {
    this.showDrawer.set(true);
  }

  onManageCategories() {
    this.router.navigate(['/admin/products/categories']);
  }

  onEditProduct(id: string) {
    this.router.navigate(['/admin/products', id, 'edit']);
  }

  onViewProduct(id: string) {
    // For now navigate to edit, or define a separate view if needed
    this.router.navigate(['/admin/products', id, 'edit']);
  }

  onDeleteProduct(product: Product) {
    this.confirmationService.confirm({
      message: `Set "${product.name}" to inactive?`,
      header: 'Deactivate Product',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger p-button-text',
      rejectButtonStyleClass: 'p-button-text p-button-text',
      acceptIcon: 'none',
      rejectIcon: 'none',
      accept: () => {
        this.adminProducts.updateProductStatus(product.id, 'INACTIVE').subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Updated',
              detail: 'Product set to inactive successfully'
            });
            this.adminProducts.loadProducts({ limit: 100, offset: 0 }).subscribe();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Failed',
              detail: 'Could not update product status.'
            });
          }
        });
      }
    });
  }

  getStatusSeverity(status: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | undefined {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'DRAFT': return 'secondary';
      case 'INACTIVE': return 'warn';
      default: return undefined;
    }
  }
}
