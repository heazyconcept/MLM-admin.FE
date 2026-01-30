import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models/product.model';
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
import { MessageService, ConfirmationService } from 'primeng/api';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { DataTableTemplateDirective } from '../../../shared/components/data-table/data-table-template.directive';
import { TableColumn, TableConfig, TableAction } from '../../../shared/components/data-table/data-table.types';

@Component({
  selector: 'app-product-list',
  standalone: true,
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
    ToastModule,
    DataTableComponent,
    DataTableTemplateDirective,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductListComponent {
  private productService = inject(ProductService);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // State
  products = this.productService.products;
  categories = this.productService.categories;
  
  searchQuery = signal('');
  selectedCategory = signal<string | null>(null);
  selectedStatus = signal<string | null>(null);
  showDrawer = signal(false);

  statusOptions = [
    { label: 'All Statuses', value: null },
    { label: 'Draft', value: 'Draft' },
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
    { label: 'Archived', value: 'Archived' }
  ];

  categoryOptions = computed(() => [
    { label: 'All Categories', value: null },
    ...this.categories().map(c => ({ label: c.name, value: c.name }))
  ]);

  filteredProducts = computed(() => {
    let list = this.products();
    const search = this.searchQuery().toLowerCase();
    const cat = this.selectedCategory();
    const status = this.selectedStatus();

    if (search) {
      list = list.filter(p => 
        p.name.toLowerCase().includes(search) || 
        p.sku.toLowerCase().includes(search)
      );
    }

    if (cat) {
      list = list.filter(p => p.category === cat);
    }

    if (status) {
      list = list.filter(p => p.status === status);
    }

    return list;
  });

  // Table configurations
  columns = signal<TableColumn<Product>[]>([
    { 
      field: 'thumbnail', 
      header: 'Image', 
      width: '80px', 
      align: 'center' 
    },
    { 
      field: 'name', 
      header: 'Product Info'
    },
    { 
      field: 'category', 
      header: 'Category', 
      width: '150px',
      class: 'text-slate-600'
    },
    { 
      field: 'price', 
      header: 'Price / PV', 
      width: '150px'
    },
    { 
      field: 'status', 
      header: 'Status', 
      width: '120px', 
      align: 'center'
    },
    { 
      field: 'assignedMerchants', 
      header: 'Merchants', 
      width: '100px', 
      align: 'center'
    }
  ]);

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

  actions = signal<TableAction<Product>[]>([
    {
      icon: 'pi pi-eye',
      tooltip: 'View Details',
      command: (product) => this.onViewProduct(product.id),
      severity: 'secondary'
    },
    {
      icon: 'pi pi-pencil',
      tooltip: 'Edit Product',
      command: (product) => this.onEditProduct(product.id),
      severity: 'success'
    },
    {
      icon: 'pi pi-trash',
      tooltip: 'Delete Product',
      command: (product) => this.onDeleteProduct(product),
      severity: 'danger'
    }
  ]);

  onAddProduct() {
    this.showDrawer.set(true);
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
      message: `Are you sure you want to delete "${product.name}"?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger p-button-text',
      rejectButtonStyleClass: 'p-button-text p-button-text',
      acceptIcon: 'none',
      rejectIcon: 'none',
      accept: () => {
        this.productService.deleteProduct(product.id);
        this.messageService.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Product deleted successfully'
        });
      }
    });
  }

  getStatusSeverity(status: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | undefined {
    switch (status) {
      case 'Active': return 'success';
      case 'Draft': return 'secondary';
      case 'Inactive': return 'warn';
      case 'Archived': return 'danger';
      default: return undefined;
    }
  }
}
