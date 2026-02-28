import { Injectable, signal, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { Observable } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Product, ProductStatus, Category } from '../../../core/models/product.model';

/** API category shape (OpenAPI uses placeholder; adapt to real response) */
export interface AdminCategoryDto {
  id: string;
  name: string;
  description?: string;
}

/** API product list item shape (adapt to real response) */
export interface AdminProductDto {
  id: string;
  name: string;
  sku?: string;
  categoryId?: string;
  category?: string;
  shortDescription?: string;
  fullDescription?: string;
  price?: number;
  currency?: string;
  pv?: number;
  cpv?: number;
  images?: string[];
  thumbnail?: string;
  status?: string;
  visibility?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface AdminProductListParams {
  categoryId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface PriceHistoryEntry {
  amount: number;
  currency: string;
  effectiveAt: string;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class AdminProductsService {
  private readonly api = inject(ApiService);

  categories = signal<Category[]>([]);
  products = signal<Product[]>([]);
  loadingCategories = signal(false);
  loadingProducts = signal(false);
  error = signal<string | null>(null);
  totalProducts = signal(0);

  loadCategories(): Observable<Category[]> {
    this.loadingCategories.set(true);
    this.error.set(null);
    return this.api.get<AdminCategoryDto[] | { items?: AdminCategoryDto[] }>('admin/categories').pipe(
      map((res) => {
        const list = Array.isArray(res) ? res : (res?.items ?? []);
        return list.map((c) => ({ id: c.id, name: c.name, description: c.description }));
      }),
      tap((list) => {
        this.categories.set(list);
        this.loadingCategories.set(false);
      }),
      catchError((err) => {
        this.error.set(err?.message ?? 'Failed to load categories');
        this.loadingCategories.set(false);
        return of([]);
      })
    );
  }

  loadProducts(params: AdminProductListParams = {}): Observable<Product[]> {
    this.loadingProducts.set(true);
    this.error.set(null);
    const query: Record<string, string | number> = {
      categoryId: params.categoryId ?? '',
      status: params.status ?? '',
      limit: params.limit ?? 20,
      offset: params.offset ?? 0
    };

    return this.api
      .get<AdminProductDto[] | { items?: AdminProductDto[]; total?: number }>('admin/products', query)
      .pipe(
        map((res) => {
          const list = Array.isArray(res) ? res : (res?.items ?? []);
          const total = Array.isArray(res) ? list.length : (res as { total?: number })?.total ?? list.length;
          this.totalProducts.set(total);
          return list.map((p) => this.mapProductDtoToProduct(p));
        }),
        tap((list) => {
          this.products.set(list);
          this.loadingProducts.set(false);
        }),
        catchError((err) => {
          this.error.set(err?.message ?? 'Failed to load products');
          this.loadingProducts.set(false);
          this.products.set([]);
          return of([]);
        })
      );
  }

  createCategory(body: { name: string; description?: string }): Observable<Category> {
    return this.api.post<AdminCategoryDto>('admin/categories', body).pipe(
      map((c) => ({ id: c.id, name: c.name, description: c.description })),
      tap((cat) => this.categories.update((list) => [...list, cat]))
    );
  }

  updateCategory(id: string, body: { name?: string; description?: string }): Observable<Category> {
    return this.api.put<AdminCategoryDto>(`admin/categories/${encodeURIComponent(id)}`, body).pipe(
      map((c) => ({ id: c.id, name: c.name, description: c.description })),
      tap((updated) => {
        this.categories.update((list) =>
          list.map((c) => (c.id === id ? updated : c))
        );
      })
    );
  }

  createProduct(body: Partial<Product> & { name: string; categoryId?: string; category?: string }): Observable<Product> {
    const dto = this.mapProductToDto(body);
    return this.api.post<AdminProductDto>('admin/products', dto).pipe(
      map((p) => this.mapProductDtoToProduct(p)),
      tap((p) => this.products.update((list) => [p, ...list]))
    );
  }

  updateProduct(id: string, body: Partial<Product>): Observable<Product> {
    const dto = this.mapProductToDto(body);
    return this.api.put<AdminProductDto>(`admin/products/${encodeURIComponent(id)}`, dto).pipe(
      map((p) => this.mapProductDtoToProduct(p)),
      tap((updated) => {
        this.products.update((list) =>
          list.map((p) => (p.id === id ? updated : p))
        );
      })
    );
  }

  updateProductStatus(id: string, status: ProductStatus): Observable<unknown> {
    return this.api.put(`admin/products/${encodeURIComponent(id)}/status`, { status }).pipe(
      tap(() => {
        this.products.update((list) =>
          list.map((p) => (p.id === id ? { ...p, status } : p))
        );
      })
    );
  }

  setProductPrice(id: string, amount: number, currency: string): Observable<unknown> {
    return this.api.post(`admin/products/${encodeURIComponent(id)}/price`, { amount, currency }).pipe(
      tap(() => {
        this.products.update((list) =>
          list.map((p) => (p.id === id ? { ...p, price: amount, currency: currency as 'USD' | 'NGN' } : p))
        );
      })
    );
  }

  getPriceHistory(productId: string): Observable<PriceHistoryEntry[]> {
    return this.api.get<PriceHistoryEntry[]>(`admin/products/${encodeURIComponent(productId)}/price-history`);
  }

  /** Resolve a single product by id (from current list; no GET /admin/products/:id in API) */
  getProductById(id: string): Product | null {
    return this.products().find((p) => p.id === id) ?? null;
  }

  private mapProductDtoToProduct(dto: AdminProductDto): Product {
    return {
      id: dto.id,
      name: dto.name,
      sku: dto.sku ?? '',
      category: dto.category ?? dto.categoryId ?? '',
      shortDescription: dto.shortDescription ?? '',
      fullDescription: dto.fullDescription ?? '',
      price: dto.price ?? 0,
      currency: (dto.currency as 'USD' | 'NGN') ?? 'USD',
      pv: dto.pv ?? 0,
      cpv: dto.cpv ?? 0,
      images: dto.images ?? [],
      thumbnail: dto.thumbnail ?? '',
      status: (dto.status as ProductStatus) ?? 'Draft',
      visibility: dto.visibility ?? true,
      purchaseEligibility: ['Cash'],
      packageRestrictions: [],
      assignedMerchants: [],
      createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
      updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : new Date(),
      createdBy: ''
    };
  }

  private mapProductToDto(p: Partial<Product>): Record<string, unknown> {
    const dto: Record<string, unknown> = {};
    if (p.name != null) dto['name'] = p.name;
    if (p.sku != null) dto['sku'] = p.sku;
    if (p.category != null) dto['categoryId'] = p.category;
    if (p.shortDescription != null) dto['shortDescription'] = p.shortDescription;
    if (p.fullDescription != null) dto['fullDescription'] = p.fullDescription;
    if (p.price != null) dto['price'] = p.price;
    if (p.currency != null) dto['currency'] = p.currency;
    if (p.pv != null) dto['pv'] = p.pv;
    if (p.cpv != null) dto['cpv'] = p.cpv;
    if (p.images != null) dto['images'] = p.images;
    if (p.thumbnail != null) dto['thumbnail'] = p.thumbnail;
    if (p.status != null) dto['status'] = p.status;
    if (p.visibility != null) dto['visibility'] = p.visibility;
    return dto;
  }
}
