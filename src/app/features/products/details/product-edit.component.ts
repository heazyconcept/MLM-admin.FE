import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AdminProductsService } from '../services/admin-products.service';
import { Product, ProductStatus, PackageCode, ProductPrice, ProductImage } from '../../../core/models/product.model';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProductImagesComponent } from './product-images.component';

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
    ToggleSwitchModule,
    TagModule,
    ToastModule,
    ProductImagesComponent
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
  private adminProducts = inject(AdminProductsService);
  private messageService = inject(MessageService);

  productId = signal<string | null>(null);
  productImages = signal<ProductImage[]>([]);
  isSaving = signal(false);
  isUpdatingStatus = signal(false);
  isSettingPrice = signal(false);
  product = computed(() => {
    const id = this.productId();
    const list = this.adminProducts.products();
    return id ? (list.find((p) => p.id === id) ?? null) : null;
  });
  productLoading = signal(true);
  poolInput = signal<number | null>(null);
  settingPool = signal(false);
  toppingUpPool = signal(false);
  priceHistory = signal<ProductPrice[]>([]);
  loadingHistory = signal(false);
  canSetPool = computed(() => this.poolInput() != null && Math.trunc(Number(this.poolInput())) >= 0 && !this.settingPool());
  canTopUpPool = computed(() => this.poolInput() != null && Math.trunc(Number(this.poolInput())) > 0 && !this.toppingUpPool());

  /** Whether the current price is scheduled (future effectiveFrom).
   *  A 5-minute buffer avoids false positives from client/server clock drift
   *  when the backend sets effectiveFrom to "now". */
  priceIsScheduled = computed(() => {
    const price = this.product()?.currentPrice;
    if (!price?.effectiveFrom) return false;
    const BUFFER_MS = 5 * 60 * 1000; // 5 minutes
    return new Date(price.effectiveFrom).getTime() > Date.now() + BUFFER_MS;
  });

  /** Whether the product can be activated right now */
  canActivate = computed(() => {
    const p = this.product();
    if (!p?.currentPrice) return false;
    return !this.priceIsScheduled();
  });

  categories = this.adminProducts.categories;

  categoryOptions = computed(() => 
    this.categories().filter((c) => c.isActive).map(c => ({ label: c.name, value: c.id }))
  );

  statusOptions = [
    { label: 'Draft', value: 'DRAFT' as ProductStatus },
    { label: 'Active', value: 'ACTIVE' as ProductStatus },
    { label: 'Inactive', value: 'INACTIVE' as ProductStatus }
  ];

  packageOptions = [
    { label: 'Nickel', value: 'NICKEL' as PackageCode },
    { label: 'Silver', value: 'SILVER' as PackageCode },
    { label: 'Gold', value: 'GOLD' as PackageCode },
    { label: 'Platinum', value: 'PLATINUM' as PackageCode },
    { label: 'Ruby', value: 'RUBY' as PackageCode },
    { label: 'Diamond', value: 'DIAMOND' as PackageCode }
  ];

  productForm = this.fb.group({
    name: ['', [Validators.required]],
    sku: ['', [Validators.required]],
    categoryId: ['', [Validators.required]],
    description: [''],
    visibleToAll: [true],
    visibleToPackages: [[] as PackageCode[]],
    merchantOnly: [false],
    status: ['DRAFT' as ProductStatus, [Validators.required]]
  });

  priceForm = this.fb.group({
    basePrice: [0, [Validators.required, Validators.min(0.01)]],
    nonMemberBasePrice: [null as number | null],
    pv: [0, [Validators.required, Validators.min(0)]],
    cpv: [0, [Validators.required, Validators.min(0)]],
    effectiveFrom: ['']
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.adminProducts.loadCategories().subscribe();
    if (id) {
      this.productId.set(id);
      const p = this.product();
      if (p) {
        this.patchFormFromProduct(p);
        this.loadPriceHistory(id);
        this.loadProductImages(id);
        this.productLoading.set(false);
      } else {
        this.adminProducts.loadProductById(id).subscribe({
          next: (found) => {
            this.patchFormFromProduct(found);
            this.loadPriceHistory(id);
            this.loadProductImages(id);
            this.productLoading.set(false);
          },
          error: () => {
            this.adminProducts.loadProducts({ limit: 500, offset: 0 }).subscribe({
              next: () => {
                const found = this.adminProducts.getProductById(id);
                if (found) {
                  this.patchFormFromProduct(found);
                  this.loadPriceHistory(id);
                  this.loadProductImages(id);
                } else {
                  this.messageService.add({
                    severity: 'error',
                    summary: 'Product not found',
                    detail: 'Could not load this product.'
                  });
                  void this.router.navigate(['/admin/products']);
                }
                this.productLoading.set(false);
              },
              error: () => {
                this.productLoading.set(false);
                void this.router.navigate(['/admin/products']);
              }
            });
          }
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
      categoryId: p.categoryId,
      description: p.description,
      visibleToAll: p.visibleToAll,
      visibleToPackages: p.visibleToPackages,
      merchantOnly: p.merchantOnly,
      status: p.status
    });

    // Prefill price form if current price exists
    if (p.currentPrice) {
      const effectiveFromDate = p.currentPrice.effectiveFrom;
      let effectiveFromFormatted = '';
      if (effectiveFromDate) {
        const date = new Date(effectiveFromDate);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        effectiveFromFormatted = `${year}-${month}-${day}T${hours}:${minutes}`;
      }

      this.priceForm.patchValue({
        basePrice: p.currentPrice.basePrice,
        nonMemberBasePrice: p.currentPrice.nonMemberBasePrice,
        pv: p.currentPrice.pv,
        cpv: p.currentPrice.cpv,
        effectiveFrom: effectiveFromFormatted
      });
    }
  }

  onSave() {
    if (this.productForm.valid) {
      const id = this.productId();
      if (!id) return;
      const formValue = this.productForm.value;
      const status = formValue.status as ProductStatus;

      if (status === 'ACTIVE') {
        const hasPrice = !!this.product()?.currentPrice;
        if (!hasPrice) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Price Required',
            detail: 'Set a product price before activating this product.'
          });
          return;
        }
        if (this.priceIsScheduled()) {
          const effectiveFrom = this.product()!.currentPrice!.effectiveFrom;
          const date = new Date(effectiveFrom).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
          });
          this.messageService.add({
            severity: 'warn',
            summary: 'Scheduled Price',
            detail: `The current price is scheduled for ${date}. The product cannot be activated until that date. Set a price without a future date to activate immediately.`
          });
          return;
        }
      }

      this.isSaving.set(true);
      this.adminProducts.updateProduct(id, {
        categoryId: formValue.categoryId || undefined,
        name: formValue.name || undefined,
        description: formValue.description || '',
        visibleToAll: !!formValue.visibleToAll,
        visibleToPackages: formValue.visibleToAll ? [] : (formValue.visibleToPackages || []),
        merchantOnly: !!formValue.merchantOnly,
        status: status || undefined
      }).subscribe({
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

  onSetPool(): void {
    const id = this.productId();
    const quantity = Math.max(0, Math.trunc(Number(this.poolInput() ?? 0)));
    if (!id || quantity < 0 || this.settingPool()) return;

    this.settingPool.set(true);
    this.adminProducts.setProductPool(id, quantity).subscribe({
      next: () => {
        this.settingPool.set(false);
        this.poolInput.set(null);
        this.messageService.add({
          severity: 'success',
          summary: 'Pool Updated',
          detail: 'Admin pool quantity has been set successfully.'
        });
      },
      error: (err) => {
        this.settingPool.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Update Failed',
          detail: err?.error?.message ?? 'Could not set admin pool quantity.'
        });
      }
    });
  }

  onTopUpPool(): void {
    const id = this.productId();
    const quantity = Math.max(0, Math.trunc(Number(this.poolInput() ?? 0)));
    if (!id || quantity <= 0 || this.toppingUpPool()) return;

    this.toppingUpPool.set(true);
    this.adminProducts.topUpProductPool(id, quantity).subscribe({
      next: () => {
        this.toppingUpPool.set(false);
        this.poolInput.set(null);
        this.messageService.add({
          severity: 'success',
          summary: 'Pool Topped Up',
          detail: 'Admin pool quantity has been increased successfully.'
        });
      },
      error: (err) => {
        this.toppingUpPool.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Top-up Failed',
          detail: err?.error?.message ?? 'Could not top up admin pool.'
        });
      }
    });
  }

  onApplyStatus(): void {
    const id = this.productId();
    if (!id) return;

    const status = this.productForm.get('status')?.value as ProductStatus;

    if (status === 'ACTIVE') {
      const hasPrice = !!this.product()?.currentPrice;
      if (!hasPrice) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Price Required',
          detail: 'Set a product price before activating this product.'
        });
        return;
      }
      if (this.priceIsScheduled()) {
        const effectiveFrom = this.product()!.currentPrice!.effectiveFrom;
        const date = new Date(effectiveFrom).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        this.messageService.add({
          severity: 'warn',
          summary: 'Scheduled Price',
          detail: `The current price is scheduled for ${date}. The product cannot be activated until that date. Set a price without a future date to activate immediately.`
        });
        return;
      }
    }

    this.isUpdatingStatus.set(true);
    this.adminProducts.updateProductStatus(id, status).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Status Updated',
          detail: 'Product status updated successfully.'
        });
        this.isUpdatingStatus.set(false);
      },
      error: (err: any) => {
        const messages = err?.error?.message;
        const detail = Array.isArray(messages) ? messages.join('. ') : (messages || 'Could not update product status.');
        this.messageService.add({
          severity: 'error',
          summary: 'Status Update Failed',
          detail
        });
        this.isUpdatingStatus.set(false);
      }
    });
  }

 getStatusClass(status: string): string {
  const map: Record<string, string> = {
    ACTIVE:   'bg-brand-green-light text-brand-green-dark',
    DRAFT:    'bg-slate-100 text-slate-600',
    INACTIVE: 'bg-mlm-red-50 text-mlm-red-700',
  };
  return map[status?.toUpperCase()] ?? 'bg-slate-100 text-slate-500';
}

  onSetPrice(): void {
    if (this.priceForm.invalid) {
      this.priceForm.markAllAsTouched();
      return;
    }

    const id = this.productId();
    if (!id) return;

    const formValue = this.priceForm.value;
    const effectiveFromValue = formValue.effectiveFrom?.trim();
    if (effectiveFromValue) {
      const effectiveDate = new Date(effectiveFromValue);
      if (effectiveDate.getTime() < Date.now()) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Invalid Effective Date',
          detail: 'Effective date cannot be in the past.'
        });
        return;
      }
    }

    this.isSettingPrice.set(true);
    this.adminProducts.setProductPrice(id, {
      basePrice: Number(formValue.basePrice),
      nonMemberBasePrice: formValue.nonMemberBasePrice == null ? undefined : Number(formValue.nonMemberBasePrice),
      pv: Number(formValue.pv),
      cpv: Number(formValue.cpv),
      effectiveFrom: effectiveFromValue ? new Date(effectiveFromValue).toISOString() : undefined
    }).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Price Set',
          detail: 'Product price has been updated.'
        });
        this.loadPriceHistory(id);
        this.isSettingPrice.set(false);
      },
      error: (err: any) => {
        const messages = err?.error?.message;
        const detail = Array.isArray(messages) ? messages.join('. ') : (messages || 'Could not set product price.');
        this.messageService.add({
          severity: 'error',
          summary: 'Price Update Failed',
          detail
        });
        this.isSettingPrice.set(false);
      }
    });
  }

  private loadPriceHistory(productId: string): void {
    this.loadingHistory.set(true);
    this.adminProducts.getPriceHistory(productId).subscribe({
      next: (rows) => {
        this.priceHistory.set(rows);
        this.loadingHistory.set(false);
      },
      error: () => {
        this.priceHistory.set([]);
        this.loadingHistory.set(false);
      }
    });
  }

  /** Load existing images from the product's data. */
  private loadProductImages(productId: string): void {
    this.adminProducts.getProductImages(productId).subscribe({
      next: (imgs) => {
        if (imgs.length > 0) {
          this.productImages.set(imgs);
        } else {
          // Fallback: use images already present on the product DTO
          const p = this.product();
          if (p?.images?.length) {
            this.productImages.set(p.images);
          }
        }
      }
    });
  }
}
