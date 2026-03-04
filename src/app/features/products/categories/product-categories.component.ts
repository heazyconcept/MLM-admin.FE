import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DrawerModule } from 'primeng/drawer';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { AdminProductsService } from '../services/admin-products.service';
import { Category } from '../../../core/models/product.model';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-product-categories',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    ToggleSwitchModule,
    ToastModule,
    TooltipModule,
    DrawerModule,
    SelectModule,
    DataTableComponent,
    StatusBadgeComponent
  ],
  providers: [MessageService],
  templateUrl: './product-categories.component.html',
  styleUrls: ['./product-categories.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductCategoriesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly adminProducts = inject(AdminProductsService);

  readonly categories = this.adminProducts.categories;
  readonly loading = this.adminProducts.loadingCategories;
  readonly isSaving = signal(false);
  readonly editingCategoryId = signal<string | null>(null);
  readonly drawerVisible = signal(false);
  readonly searchQuery = signal('');
  statusFilter = 'all';

  readonly statusFilterOptions = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' }
  ];

  readonly categoryHeaders = ['Name', 'Slug', 'Status', 'Created', 'Updated', 'Actions'];

  readonly filteredCategories = computed(() => {
    let list = this.categories();
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      list = list.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.slug.toLowerCase().includes(query)
      );
    }
    if (this.statusFilter === 'active') {
      list = list.filter(c => c.isActive);
    } else if (this.statusFilter === 'inactive') {
      list = list.filter(c => !c.isActive);
    }
    return list;
  });

  categoryForm = this.fb.group({
    name: ['', [Validators.required]],
    slug: ['', [Validators.required]],
    description: [''],
    isActive: [true]
  });

  ngOnInit(): void {
    this.onRefresh();
  }

  onRefresh(): void {
    this.adminProducts.loadCategories().subscribe();
  }

  onBackToProducts(): void {
    this.router.navigate(['/admin/products']);
  }

  onOpenDrawer(): void {
    this.editingCategoryId.set(null);
    this.categoryForm.reset({ name: '', slug: '', description: '', isActive: true });
    this.drawerVisible.set(true);
  }

  onCloseDrawer(): void {
    this.drawerVisible.set(false);
    this.editingCategoryId.set(null);
    this.categoryForm.reset({ name: '', slug: '', description: '', isActive: true });
  }

  onNameInput(): void {
    if (this.editingCategoryId()) return;
    const name = this.categoryForm.get('name')?.value?.trim() ?? '';
    this.categoryForm.get('slug')?.setValue(this.toSlug(name));
  }

  onEdit(category: Category): void {
    this.editingCategoryId.set(category.id);
    this.categoryForm.patchValue({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      isActive: category.isActive
    });
    this.drawerVisible.set(true);
  }

  onClearFilters(): void {
    this.searchQuery.set('');
    this.statusFilter = 'all';
  }

  onSubmit(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    const value = this.categoryForm.value;
    const payload = {
      name: value.name || '',
      slug: value.slug || '',
      description: value.description || '',
      isActive: !!value.isActive
    };

    this.isSaving.set(true);

    const editingId = this.editingCategoryId();
    const request$ = editingId
      ? this.adminProducts.updateCategory(editingId, payload)
      : this.adminProducts.createCategory(payload);

    request$.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: editingId ? 'Category Updated' : 'Category Created',
          detail: editingId ? 'Category updated successfully.' : 'Category created successfully.'
        });
        this.onCloseDrawer();
        this.isSaving.set(false);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Save Failed',
          detail: 'Could not save category.'
        });
        this.isSaving.set(false);
      }
    });
  }

  private toSlug(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
}
