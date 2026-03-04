import { Injectable, signal, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { Observable } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Product, ProductStatus, Category, PackageCode, ProductPrice, ProductImage } from '../../../core/models/product.model';

export interface AdminCategoryDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminProductDto {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  sku: string;
  status?: ProductStatus;
  visibleToAll?: boolean;
  visibleToPackages?: PackageCode[];
  merchantOnly?: boolean;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  price?: AdminProductPriceDto | null;
  currentPrice?: AdminProductPriceDto | null;
  images?: ProductImage[];
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface AdminProductListParams {
  categoryId?: string;
  status?: ProductStatus;
  limit?: number;
  offset?: number;
}

export interface AdminProductPriceDto {
  id: string;
  productId: string;
  basePrice: number;
  nonMemberBasePrice?: number | null;
  pv: number;
  cpv: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  createdAt: string;
}

export interface SetProductPricePayload {
  basePrice: number;
  nonMemberBasePrice?: number;
  pv: number;
  cpv: number;
  effectiveFrom?: string;
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
        return list.map((c) => this.mapCategoryDtoToCategory(c));
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
    const query: Record<string, string | number> = {};
    if (params.categoryId) query['categoryId'] = params.categoryId;
    if (params.status) query['status'] = params.status;
    if (params.limit != null) query['limit'] = params.limit;
    if (params.offset != null) query['offset'] = params.offset;

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

  createCategory(body: { name: string; slug: string; description?: string; isActive?: boolean }): Observable<Category> {
    return this.api.post<AdminCategoryDto>('admin/categories', body).pipe(
      map((c) => this.mapCategoryDtoToCategory(c)),
      tap((cat) => this.categories.update((list) => [...list, cat]))
    );
  }

  updateCategory(
    id: string,
    body: { name?: string; slug?: string; description?: string; isActive?: boolean }
  ): Observable<Category> {
    return this.api.put<AdminCategoryDto>(`admin/categories/${encodeURIComponent(id)}`, body).pipe(
      map((c) => this.mapCategoryDtoToCategory(c)),
      tap((updated) => {
        this.categories.update((list) =>
          list.map((c) => (c.id === id ? updated : c))
        );
      })
    );
  }

  createProduct(body: {
    categoryId: string;
    name: string;
    description?: string;
    sku: string;
    status?: ProductStatus;
    visibleToAll?: boolean;
    visibleToPackages?: PackageCode[];
    merchantOnly?: boolean;
  }): Observable<Product> {
    const dto = this.mapProductToDto(body);
    return this.api.post<AdminProductDto>('admin/products', dto).pipe(
      map((p) => this.mapProductDtoToProduct(p)),
      tap((p) => this.products.update((list) => [p, ...list]))
    );
  }

  updateProduct(
    id: string,
    body: {
      categoryId?: string;
      name?: string;
      description?: string;
      status?: ProductStatus;
      visibleToAll?: boolean;
      visibleToPackages?: PackageCode[];
      merchantOnly?: boolean;
    }
  ): Observable<Product> {
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

  updateProductStatus(id: string, status: ProductStatus): Observable<Product> {
    return this.api.put<AdminProductDto>(`admin/products/${encodeURIComponent(id)}/status`, { status }).pipe(
      map((p) => this.mapProductDtoToProduct(p)),
      tap(() => {
        this.products.update((list) =>
          list.map((p) => (p.id === id ? { ...p, status } : p))
        );
      })
    );
  }

  setProductPrice(id: string, payload: SetProductPricePayload): Observable<ProductPrice> {
    return this.api.post<AdminProductPriceDto>(`admin/products/${encodeURIComponent(id)}/price`, payload).pipe(
      map((price) => this.mapPriceDtoToPrice(price)),
      tap((currentPrice) => {
        this.products.update((list) =>
          list.map((p) => (p.id === id ? { ...p, currentPrice } : p))
        );
      })
    );
  }

  getPriceHistory(productId: string): Observable<ProductPrice[]> {
    return this.api
      .get<AdminProductPriceDto[]>(`admin/products/${encodeURIComponent(productId)}/price-history`)
      .pipe(map((rows) => rows.map((row) => this.mapPriceDtoToPrice(row))));
  }

  // ── Product Images ──────────────────────────────────────────────

  /** Upload one or more images. Returns the full image list for the product. */
  uploadImages(productId: string, files: File[]): Observable<ProductImage[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    return this.api.post<ProductImage[]>(
      `admin/products/${encodeURIComponent(productId)}/images`,
      formData
    ).pipe(
      tap((imgs) => this.updateProductImages(productId, imgs))
    );
  }

  /** Delete a single image. */
  deleteImage(productId: string, imageId: string): Observable<void> {
    return this.api.delete<void>(
      `admin/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(imageId)}`
    ).pipe(
      tap(() => {
        this.products.update((list) =>
          list.map((p) =>
            p.id === productId
              ? { ...p, images: (p.images ?? []).filter((img) => img.id !== imageId) }
              : p
          )
        );
      })
    );
  }

  /** Reorder images. Returns the full image list in the new order. */
  reorderImages(productId: string, order: { id: string; position: number }[]): Observable<ProductImage[]> {
    return this.api.put<ProductImage[]>(
      `admin/products/${encodeURIComponent(productId)}/images/reorder`,
      { order }
    ).pipe(
      tap((imgs) => this.updateProductImages(productId, imgs))
    );
  }

  /** Get images for a product from the product's own data (no separate GET endpoint). */
  getProductImages(productId: string): Observable<ProductImage[]> {
    // The API does not expose a standalone GET /images endpoint.
    // Return images already present on the loaded product DTO.
    const product = this.products().find((p) => p.id === productId);
    return of(product?.images ?? []);
  }

  /** Update the images array on a product in the local products signal. */
  private updateProductImages(productId: string, images: ProductImage[]): void {
    this.products.update((list) =>
      list.map((p) =>
        p.id === productId ? { ...p, images, thumbnail: images[0]?.url ?? '' } : p
      )
    );
  }

  /** Resolve a single product by id (from current list; no GET /admin/products/:id in API) */
  getProductById(id: string): Product | null {
    return this.products().find((p) => p.id === id) ?? null;
  }

  private mapCategoryDtoToCategory(dto: AdminCategoryDto): Category {
    return {
      id: dto.id,
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      isActive: dto.isActive ?? true,
      createdAt: dto.createdAt ? new Date(dto.createdAt) : undefined,
      updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : undefined
    };
  }

  private mapPriceDtoToPrice(dto: AdminProductPriceDto): ProductPrice {
    return {
      id: dto.id,
      productId: dto.productId,
      basePrice: dto.basePrice,
      nonMemberBasePrice: dto.nonMemberBasePrice,
      pv: dto.pv,
      cpv: dto.cpv,
      effectiveFrom: dto.effectiveFrom,
      effectiveTo: dto.effectiveTo,
      createdAt: dto.createdAt
    };
  }

  private mapProductDtoToProduct(dto: AdminProductDto): Product {
    const currentPrice = dto.currentPrice ?? dto.price ?? null;
    return {
      id: dto.id,
      categoryId: dto.categoryId,
      categoryName: dto.category?.name ?? dto.categoryId,
      name: dto.name,
      description: dto.description ?? '',
      sku: dto.sku,
      status: dto.status ?? 'DRAFT',
      visibleToAll: dto.visibleToAll ?? true,
      visibleToPackages: dto.visibleToPackages ?? [],
      merchantOnly: dto.merchantOnly ?? false,
      currentPrice: currentPrice ? this.mapPriceDtoToPrice(currentPrice) : null,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
      images: dto.images ?? [],
      thumbnail: dto.images?.[0]?.url ?? '',
      assignedMerchants: [],
      createdBy: ''
    };
  }

  private mapProductToDto(p: {
    categoryId?: string;
    name?: string;
    description?: string;
    sku?: string;
    status?: ProductStatus;
    visibleToAll?: boolean;
    visibleToPackages?: PackageCode[];
    merchantOnly?: boolean;
  }): Record<string, unknown> {
    const dto: Record<string, unknown> = {};
    if (p.categoryId != null) dto['categoryId'] = p.categoryId;
    if (p.name != null) dto['name'] = p.name;
    if (p.description != null) dto['description'] = p.description;
    if (p.sku != null) dto['sku'] = p.sku;
    if (p.status != null) dto['status'] = p.status;
    if (p.visibleToAll != null) dto['visibleToAll'] = p.visibleToAll;
    if (p.visibleToPackages != null) dto['visibleToPackages'] = p.visibleToPackages;
    if (p.merchantOnly != null) dto['merchantOnly'] = p.merchantOnly;
    return dto;
  }
}
