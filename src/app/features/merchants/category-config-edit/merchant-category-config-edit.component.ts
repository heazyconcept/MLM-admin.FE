import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  OnInit,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MerchantCategoryConfigService } from '../services/merchant-category-config.service';
import { AdminProductsService } from '../../products/services/admin-products.service';
import {
  MerchantCategoryConfig,
  MerchantCategoryType,
  OnboardingItem,
  UpdateMerchantCategoryConfigBody,
} from '../../../core/models/merchant-category-config.model';
import { PermissionService } from '../../../core/services/permission.service';
import { Feature } from '../../../core/models/admin-permission.model';
import { Product } from '../../../core/models/product.model';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-merchant-category-config-edit',
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    ButtonModule,
    ToastModule,
    TooltipModule,
  ],
  templateUrl: './merchant-category-config-edit.component.html',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MerchantCategoryConfigEditComponent implements OnInit {
  private configService = inject(MerchantCategoryConfigService);
  private productService = inject(AdminProductsService);
  private permission = inject(PermissionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  merchantType = signal<MerchantCategoryType | null>(null);
  config = signal<MerchantCategoryConfig | null>(null);
  loading = signal(true);
  saving = this.configService.saving;
  isNewConfig = signal(false);

  isViewOnly = computed(() => !this.permission.canEdit(Feature.Merchants));
  activeProducts = computed(() =>
    this.productService.products().filter((p) => p.status === 'ACTIVE')
  );
  loadingProducts = this.productService.loadingProducts;

  form!: FormGroup;

  ngOnInit() {
    this.initForm();

    const type = this.route.snapshot.paramMap.get('type') as MerchantCategoryType;
    if (!type || !['REGIONAL', 'NATIONAL', 'GLOBAL'].includes(type)) {
      this.router.navigate(['/admin/merchants/category-config']);
      return;
    }
    this.merchantType.set(type);
    
    // Show info toast if not view-only
    if (!this.isViewOnly()) {
      this.messageService.add({
        severity: 'info',
        summary: 'View-Only Mode',
        detail: 'You have view-only access. Contact an administrator to make changes.'
      });
    }

    // Load products for the onboarding items selector
    this.productService.loadProducts({ status: 'ACTIVE', limit: 500 }).subscribe();

    // Load configs then populate form
    this.configService.loadConfigs().subscribe((configs) => {
      const cfg = configs.find((c) => c.merchantType === type);
      this.loading.set(false);
      if (cfg) {
        this.config.set(cfg);
        this.populateForm(cfg);
      } else {
        // No config exists yet for this type — show empty form for creation
        this.isNewConfig.set(true);
        if (!this.isViewOnly()) {
          this.messageService.add({
            severity: 'info',
            summary: 'New Configuration',
            detail: `No config yet for ${this.getTypeLabel(type)} merchants. Set values below and click Save to create it.`
          });
        }
      }
    });
  }

  private initForm() {
    this.form = this.fb.group({
      deliveryCommissionPct: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      productCommissionPct: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      registrationFeeUsd: [null as number | null],
      onboardingItems: this.fb.array([]),
    });
  }

  formatRegistrationFeeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/[^0-9]/g, '');
    if (!digits) {
      input.value = '';
      this.form.get('registrationFeeUsd')!.setValue('', { emitEvent: false });
      return;
    }
    const formatted = Number(digits).toLocaleString('en-US');
    input.value = formatted;
    this.form.get('registrationFeeUsd')!.setValue(formatted, { emitEvent: false });
  }

  private populateForm(cfg: MerchantCategoryConfig) {
    this.form.patchValue({
      deliveryCommissionPct: cfg.deliveryCommissionPct,
      productCommissionPct: cfg.productCommissionPct,
      registrationFeeUsd: cfg.registrationFeeUsd != null
        ? Number(cfg.registrationFeeUsd).toLocaleString('en-US')
        : null,
    });

    // Clear and rebuild onboarding items
    this.onboardingItems.clear();
    if (cfg.onboardingItems?.length) {
      cfg.onboardingItems.forEach((item) => this.addOnboardingItem(item));
    }
  }

  get onboardingItems(): FormArray {
    return this.form.get('onboardingItems') as FormArray;
  }

  addOnboardingItem(item?: OnboardingItem) {
    const group = this.fb.group({
      productId: [item?.productId ?? '', Validators.required],
      quantity: [item?.quantity ?? 1, [Validators.required, Validators.min(1)]],
    });
    this.onboardingItems.push(group);
    this.cdr.markForCheck();
  }

  removeOnboardingItem(index: number) {
    this.onboardingItems.removeAt(index);
    this.cdr.markForCheck();
  }

  getProductName(productId: string): string {
    const product = this.productService.products().find((p) => p.id === productId);
    return product ? `${product.name} (${product.sku})` : productId;
  }

  onSave() {
    if (this.form.invalid || !this.merchantType()) return;

    this.form.markAllAsTouched();

    const value = this.form.value;
    const rawFee = value.registrationFeeUsd;
    const parsedFee = rawFee
      ? parseFloat(rawFee.toString().replace(/,/g, ''))
      : null;
    const body: UpdateMerchantCategoryConfigBody = {
      deliveryCommissionPct: value.deliveryCommissionPct,
      productCommissionPct: value.productCommissionPct,
      registrationFeeUsd: parsedFee != null && !isNaN(parsedFee) ? parsedFee : null,
      onboardingItems: value.onboardingItems?.map((item: OnboardingItem) => ({
        productId: item.productId,
        quantity: item.quantity,
      })) ?? [],
    };

    this.configService.updateConfig(this.merchantType()!, body).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Config Updated',
          detail: `${this.getTypeLabel(this.merchantType()!)} merchant category config updated successfully`,
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message ?? 'Failed to update config',
        });
      },
    });
  }

  onCancel() {
    this.router.navigate(['/admin/merchants/category-config']);
  }

  getTypeLabel(type: MerchantCategoryType): string {
    const map: Record<MerchantCategoryType, string> = {
      REGIONAL: 'Regional',
      NATIONAL: 'National',
      GLOBAL: 'Global',
    };
    return map[type] ?? type;
  }

  getTypeIcon(type: MerchantCategoryType): string {
    const map: Record<MerchantCategoryType, string> = {
      REGIONAL: 'pi pi-map-marker',
      NATIONAL: 'pi pi-flag',
      GLOBAL: 'pi pi-globe',
    };
    return map[type] ?? 'pi pi-cog';
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!control && control.invalid && control.touched;
  }
}
