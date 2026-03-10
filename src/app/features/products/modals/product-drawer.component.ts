import { Component, inject, computed, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminProductsService } from '../services/admin-products.service';
import { MessageService } from 'primeng/api';
import { PackageCode, ProductStatus } from '../../../core/models/product.model';

@Component({
  selector: 'app-product-drawer',
  imports: [
    CommonModule,
    DrawerModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    SelectModule,
    MultiSelectModule,
    ToggleSwitchModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './product-drawer.component.html',
  styleUrls: ['./product-drawer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductDrawerComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private adminProducts = inject(AdminProductsService);
  private messageService = inject(MessageService);

  visible = input.required<boolean>();
  visibleChange = output<boolean>();
  saved = output<void>();

  categories = this.adminProducts.categories;
  categoryOptions = computed(() => 
    this.categories().filter((c) => c.isActive).map(c => ({ label: c.name, value: c.id }))
  );

  packageOptions = [
    { label: 'Nickel', value: 'NICKEL' as PackageCode },
    { label: 'Silver', value: 'SILVER' as PackageCode },
    { label: 'Gold', value: 'GOLD' as PackageCode },
    { label: 'Platinum', value: 'PLATINUM' as PackageCode },
    { label: 'Ruby', value: 'RUBY' as PackageCode },
    { label: 'Diamond', value: 'DIAMOND' as PackageCode }
  ];

  statusOptions = [
    { label: 'Draft', value: 'DRAFT' as ProductStatus },
    { label: 'Inactive', value: 'INACTIVE' as ProductStatus }
  ];

  productForm = this.fb.group({
    name: ['', [Validators.required]],
    categoryId: ['', [Validators.required]],
    description: [''],
    sku: ['', [Validators.required]],
    initialPoolQuantity: [0, [Validators.min(0)]],
    status: ['DRAFT' as ProductStatus, [Validators.required]],
    visibleToAll: [true],
    visibleToPackages: [[] as PackageCode[]],
    merchantOnly: [false]
  });

  onHide() {
    this.visibleChange.emit(false);
  }

  onSave() {
    if (this.productForm.valid) {
      const formValue = this.productForm.value;
      const visibleToAll = !!formValue.visibleToAll;
      const initialPoolQuantity = Math.max(0, Math.trunc(Number(formValue.initialPoolQuantity ?? 0)));
      this.adminProducts.createProduct({
        name: formValue.name!,
        categoryId: formValue.categoryId!,
        description: formValue.description || '',
        sku: formValue.sku!,
        initialPoolQuantity,
        status: formValue.status || 'DRAFT',
        visibleToAll,
        visibleToPackages: visibleToAll ? [] : (formValue.visibleToPackages || []),
        merchantOnly: !!formValue.merchantOnly
      }).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Product Created',
            detail: `${formValue.name} has been created successfully.`
          });
          this.saved.emit();
          this.productForm.reset({
            initialPoolQuantity: 0,
            status: 'DRAFT',
            visibleToAll: true,
            visibleToPackages: [],
            merchantOnly: false
          });
          this.onHide();
          this.router.navigate(['/admin/products']);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Create failed',
            detail: 'Could not create product. Please try again.'
          });
        }
      });
    } else {
      this.productForm.markAllAsTouched();
    }
  }
}
