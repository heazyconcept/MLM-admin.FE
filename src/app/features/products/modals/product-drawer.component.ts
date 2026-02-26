import { Component, inject, signal, computed, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminProductsService } from '../services/admin-products.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-product-drawer',
  imports: [
    CommonModule,
    DrawerModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
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
    this.categories().map(c => ({ label: c.name, value: c.name }))
  );

  productForm = this.fb.group({
    name: ['', [Validators.required]],
    category: ['', [Validators.required]],
    price: [0, [Validators.min(0)]],
    currency: ['USD'],
    pv: [0, [Validators.min(0)]],
    cpv: [0, [Validators.min(0)]],
    sku: ['']
  });

  selectedImage = signal<string | null>(null);

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

  onHide() {
    this.visibleChange.emit(false);
  }

  onSave() {
    if (this.productForm.valid) {
      const formValue = this.productForm.value;
      this.adminProducts.createProduct({
        name: formValue.name!,
        category: formValue.category!,
        price: formValue.price!,
        currency: formValue.currency as 'USD' | 'NGN',
        pv: formValue.pv!,
        cpv: formValue.cpv!,
        sku: formValue.sku || `PROD-${Date.now()}`,
        status: 'Active',
        images: this.selectedImage() ? [this.selectedImage()!] : [],
        thumbnail: this.selectedImage() || ''
      }).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Product Created',
            detail: `${formValue.name} has been created successfully.`
          });
          this.saved.emit();
          this.productForm.reset({
            price: 0,
            currency: 'USD',
            pv: 0,
            cpv: 0
          });
          this.selectedImage.set(null);
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
