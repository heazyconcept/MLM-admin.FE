import { Injectable, signal, computed } from '@angular/core';
import { Product, ProductStatus, Category, Merchant } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  
  // Mock Categories
  private categoriesState = signal<Category[]>([
    { id: 'cat_001', name: 'Wellness', description: 'Health and wellness products' },
    { id: 'cat_002', name: 'Personal Care', description: 'Daily personal care items' },
    { id: 'cat_003', name: 'Home Essentials', description: 'Essential items for every home' },
    { id: 'cat_004', name: 'Nutrition', description: 'Supplements and nutritional products' },
  ]);

  // Mock Merchants
  private merchantsState = signal<Merchant[]>([
    { id: 'mer_001', name: 'Lagos Central Hub', isDefaultPickup: true },
    { id: 'mer_002', name: 'Abuja Regional Office', isDefaultPickup: false },
    { id: 'mer_003', name: 'Port Harcourt Center', isDefaultPickup: false },
    { id: 'mer_004', name: 'Ibadan Distribution Point', isDefaultPickup: false },
  ]);

  // Mock Products
  private productsState = signal<Product[]>([
    {
      id: 'p_001',
      name: 'Ultra Vitamin C complex',
      sku: 'VIT-C-1000',
      category: 'Wellness',
      shortDescription: '1000mg Vitamin C with Rose Hips',
      fullDescription: 'High potency vitamin C supplement for immune support.',
      price: 25.00,
      currency: 'USD',
      pv: 15,
      cpv: 10,
      images: ['assets/images/products/vit-c.jpg'],
      thumbnail: 'assets/images/products/vit-c-thumb.jpg',
      status: 'Active',
      visibility: true,
      purchaseEligibility: ['Cash', 'Voucher'],
      packageRestrictions: [],
      assignedMerchants: ['mer_001', 'mer_002'],
      createdAt: new Date(2023, 10, 1),
      updatedAt: new Date(2023, 11, 15),
      createdBy: 'Admin User'
    },
    {
      id: 'p_002',
      name: 'Aloe Vera Smoothing Gel',
      sku: 'ALOE-GEL-200',
      category: 'Personal Care',
      shortDescription: 'Pure Aloe Vera soothing and moisturizing gel',
      fullDescription: '99% pure aloe vera gel for skin hydration and soothing.',
      price: 12.50,
      currency: 'USD',
      pv: 8,
      cpv: 5,
      images: ['assets/images/products/aloe.jpg'],
      thumbnail: 'assets/images/products/aloe-thumb.jpg',
      status: 'Active',
      visibility: true,
      purchaseEligibility: ['Cash', 'Autoship'],
      packageRestrictions: [],
      assignedMerchants: ['mer_001', 'mer_003', 'mer_004'],
      createdAt: new Date(2023, 11, 5),
      updatedAt: new Date(2023, 11, 5),
      createdBy: 'Admin User'
    },
    {
      id: 'p_003',
      name: 'Organic Green Tea (30 bags)',
      sku: 'TEA-GRN-30',
      category: 'Nutrition',
      shortDescription: 'Premium organic green tea',
      fullDescription: 'Antioxidant-rich green tea harvested from organic farms.',
      price: 18.00,
      currency: 'USD',
      pv: 10,
      cpv: 7,
      images: ['assets/images/products/tea.jpg'],
      thumbnail: 'assets/images/products/tea-thumb.jpg',
      status: 'Draft',
      visibility: false,
      purchaseEligibility: ['Cash'],
      packageRestrictions: [],
      assignedMerchants: [],
      createdAt: new Date(2024, 0, 10),
      updatedAt: new Date(2024, 0, 10),
      createdBy: 'Admin User'
    },
    {
      id: 'p_004',
      name: 'Multi-Surface Eco Cleaner',
      sku: 'CLN-ECO-500',
      category: 'Home Essentials',
      shortDescription: 'Biodegradable multi-surface cleaner',
      fullDescription: 'Tough on dirt, gentle on the environment. No harsh chemicals.',
      price: 9.99,
      currency: 'USD',
      pv: 5,
      cpv: 3,
      images: ['assets/images/products/cleaner.jpg'],
      thumbnail: 'assets/images/products/cleaner-thumb.jpg',
      status: 'Inactive',
      visibility: true,
      purchaseEligibility: ['Cash', 'Voucher'],
      packageRestrictions: [],
      assignedMerchants: ['mer_001'],
      createdAt: new Date(2023, 9, 20),
      updatedAt: new Date(2023, 10, 5),
      createdBy: 'Admin User'
    }
  ]);

  // Selectors
  products = computed(() => this.productsState());
  categories = computed(() => this.categoriesState());
  merchants = computed(() => this.merchantsState());

  getProduct(id: string) {
    return computed(() => this.productsState().find(p => p.id === id));
  }

  // Actions
  addProduct(product: Partial<Product>) {
    const newProduct: Product = {
      id: `p_${Date.now()}`,
      name: '',
      sku: '',
      category: '',
      shortDescription: '',
      fullDescription: '',
      price: 0,
      currency: 'USD',
      pv: 0,
      cpv: 0,
      images: [],
      thumbnail: '',
      status: 'Draft',
      visibility: false,
      purchaseEligibility: ['Cash'],
      packageRestrictions: [],
      assignedMerchants: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'Admin User',
      ...product
    };

    this.productsState.update(current => [newProduct, ...current]);
    return newProduct;
  }

  updateProduct(id: string, updates: Partial<Product>) {
    this.productsState.update(current => 
      current.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p)
    );
  }

  updateStatus(id: string, status: ProductStatus) {
    this.updateProduct(id, { status });
  }

  archiveProduct(id: string) {
    this.updateStatus(id, 'Archived');
  }

  assignMerchants(productId: string, merchantIds: string[]) {
    this.updateProduct(productId, { assignedMerchants: merchantIds });
  }

  deleteProduct(id: string) {
    this.productsState.update(current => current.filter(p => p.id !== id));
  }
}
