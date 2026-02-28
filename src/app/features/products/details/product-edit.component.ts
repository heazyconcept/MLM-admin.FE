import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ProductService } from '../../../core/services/product.service';
import { AdminProductsService } from '../services/admin-products.service';
import { Product, ProductStatus } from '../../../core/models/product.model';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { CheckboxModule } from 'primeng/checkbox';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-product-edit',
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    SelectModule,
    MultiSelectModule,
    CheckboxModule,
    ToggleSwitchModule,
    TagModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './product-edit.component.html',
  styleUrls: ['./product-edit.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductEditComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private adminProducts = inject(AdminProductsService);
  private messageService = inject(MessageService);

  productId = signal<string | null>(null);
  isSaving = signal(false);
  product = computed(() => {
    const id = this.productId();
    const list = this.adminProducts.products();
    return id ? (list.find((p) => p.id === id) ?? null) : null;
  });
  productLoading = signal(true);

  selectedImage = signal<string | null>(null);

  categories = this.adminProducts.categories;
  merchants = this.productService.merchants;

  categoryOptions = computed(() => 
    this.categories().map(c => ({ label: c.name, value: c.name }))
  );

  eligibilityOptions = [
    { label: 'Cash', value: 'Cash' },
    { label: 'Voucher', value: 'Voucher' },
    { label: 'Autoship', value: 'Autoship' }
  ];

  productForm = this.fb.group({
    name: ['', [Validators.required]],
    sku: ['', [Validators.required]],
    category: ['', [Validators.required]],
    shortDescription: [''],
    fullDescription: [''],
    price: [0, [Validators.min(0)]],
    currency: ['USD'],
    pv: [0, [Validators.min(0)]],
    cpv: [0, [Validators.min(0)]],
    visibility: [true],
    purchaseEligibility: [[] as string[]],
    status: ['Draft' as ProductStatus]
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.productId.set(id);
      const p = this.product();
      if (p) {
        this.patchFormFromProduct(p);
        this.productLoading.set(false);
      } else {
        this.adminProducts.loadProducts({ limit: 500, offset: 0 }).subscribe({
          next: () => {
            const found = this.adminProducts.getProductById(id);
            if (found) this.patchFormFromProduct(found);
            this.productLoading.set(false);
          },
          error: () => this.productLoading.set(false)
        });
      }
    } else {
      this.productLoading.set(false);
    }
  }

  private patchFormFromProduct(p: Product) {
    this.productForm.patchValue({
      name: p.name,
      sku: p.sku,
      category: p.category,
      shortDescription: p.shortDescription,
      fullDescription: p.fullDescription,
      price: p.price,
      currency: p.currency,
      pv: p.pv,
      cpv: p.cpv,
      visibility: p.visibility,
      purchaseEligibility: p.purchaseEligibility,
      status: p.status
    });
  }

  onSave() {
    if (this.productForm.valid) {
      const id = this.productId();
      if (!id) return;
      this.isSaving.set(true);
      const updateData = {
        ...this.productForm.value,
        thumbnail: this.selectedImage() || this.product()?.thumbnail
      } as Partial<Product>;
      this.adminProducts.updateProduct(id, updateData).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Product updated successfully'
          });
          this.router.navigate(['/admin/products']);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Update failed',
            detail: 'Could not update product. Please try again.'
          });
          this.isSaving.set(false);
        }
      });
    } else {
      this.productForm.markAllAsTouched();
    }
  }

  onCancel() {
    this.router.navigate(['/admin/products']);
  }

  isMerchantAssigned(merchantId: string): boolean {
    return this.product()?.assignedMerchants.includes(merchantId) || false;
  }

  toggleMerchant(merchantId: string) {
    const p = this.product();
    if (!p) return;

    let updatedMerchants = [...p.assignedMerchants];
    if (updatedMerchants.includes(merchantId)) {
      updatedMerchants = updatedMerchants.filter(id => id !== merchantId);
    } else {
      updatedMerchants.push(merchantId);
    }

    this.productService.assignMerchants(p.id, updatedMerchants);
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

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.selectedImage.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }
}
