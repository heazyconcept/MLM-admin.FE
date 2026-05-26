import { Injectable, signal, inject } from '@angular/core';
import { Observable, tap, catchError, of, map } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  MerchantCategoryConfig,
  MerchantCategoryType,
  UpdateMerchantCategoryConfigBody,
} from '../../../core/models/merchant-category-config.model';

@Injectable({
  providedIn: 'root',
})
export class MerchantCategoryConfigService {
  private readonly api = inject(ApiService);

  // State
  private readonly configsState = signal<MerchantCategoryConfig[]>([]);
  private readonly loadingState = signal<boolean>(false);
  private readonly errorState = signal<string | null>(null);
  private readonly savingState = signal<boolean>(false);

  readonly configs = this.configsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly saving = this.savingState.asReadonly();

  /**
   * GET /admin/merchant-category-config
   * Returns array of configs, one per merchant type.
   */
  loadConfigs(): Observable<MerchantCategoryConfig[]> {
    this.loadingState.set(true);
    this.errorState.set(null);

    return this.api
      .get<MerchantCategoryConfig[] | { configs?: MerchantCategoryConfig[] }>(
        'admin/merchant-category-config'
      )
      .pipe(
        map((res) => {
          return Array.isArray(res) ? res : res?.configs ?? [];
        }),
        tap((configs) => {
          this.configsState.set(configs);
          this.loadingState.set(false);
        }),
        catchError((err) => {
          this.loadingState.set(false);
          this.errorState.set(
            err?.error?.message ?? err?.message ?? 'Failed to load merchant category configs'
          );
          this.configsState.set([]);
          return of([]);
        })
      );
  }

  /**
   * Get a single config by merchant type from the local state.
   */
  getConfigByType(type: MerchantCategoryType): MerchantCategoryConfig | undefined {
    return this.configsState().find((c) => c.merchantType === type);
  }

  /**
   * PUT /admin/merchant-category-config/:type
   * Updates config for one merchant type.
   */
  updateConfig(
    type: MerchantCategoryType,
    body: UpdateMerchantCategoryConfigBody
  ): Observable<{ message: string }> {
    this.savingState.set(true);
    this.errorState.set(null);

    return this.api
      .put<{ message: string }>(
        `admin/merchant-category-config/${type}`,
        body
      )
      .pipe(
        tap(() => {
          this.savingState.set(false);
          // Update local state optimistically
          this.configsState.update((configs) =>
            configs.map((c) =>
              c.merchantType === type
                ? {
                    ...c,
                    deliveryCommissionPct: body.deliveryCommissionPct,
                    productCommissionPct: body.productCommissionPct,
                    registrationFeeNGN:
                      body.registrationFeeNGN !== undefined
                        ? body.registrationFeeNGN
                        : c.registrationFeeNGN,
                    onboardingItems:
                      body.onboardingItems !== undefined
                        ? body.onboardingItems ?? []
                        : c.onboardingItems,
                  }
                : c
            )
          );
        }),
        catchError((err) => {
          this.savingState.set(false);
          const message =
            err?.error?.message ?? err?.message ?? 'Failed to update config';
          this.errorState.set(message);
          throw err;
        })
      );
  }
}
