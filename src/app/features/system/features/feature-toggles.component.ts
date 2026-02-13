import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { PermissionService } from '../../../core/services/permission.service';
import { Feature, Action } from '../../../core/models/admin-permission.model';
import { InfoBannerComponent } from '../../../shared/components/info-banner/info-banner.component';
import { ConfirmationModalComponent, ConfirmationResult } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { SystemConfigService, FeatureToggleItem } from '../services/system-config.service';

@Component({
  selector: 'app-feature-toggles',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ToggleSwitchModule,
    InfoBannerComponent,
    ConfirmationModalComponent,
  ],
  templateUrl: './feature-toggles.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureTogglesComponent {
  protected config = inject(SystemConfigService);
  protected permission = inject(PermissionService);

  canToggleFeatures = computed(
    () => this.permission.canEdit(Feature.SystemConfig) && this.permission.canPerform(Action.ToggleFeatures)
  );
  isViewOnly = computed(() => !this.permission.canEdit(Feature.SystemConfig));

  confirmVisible = signal(false);
  localFeatures = signal<FeatureToggleItem[]>([]);
  initialFeatures = signal<FeatureToggleItem[]>([]);

  features = computed(() => this.localFeatures());

  isDirty = computed(() => {
    const current = this.localFeatures();
    const initial = this.initialFeatures();
    if (current.length !== initial.length) return true;
    return current.some((f, i) => initial[i]?.enabled !== f.enabled);
  });

  constructor() {
    effect(() => {
      const list = this.config.features();
      this.initialFeatures.set([...list.map((f) => ({ ...f }))]);
      this.localFeatures.set([...list.map((f) => ({ ...f }))]);
    });
  }

  setEnabled(id: string, enabled: boolean): void {
    if (!this.canToggleFeatures()) return;
    this.localFeatures.update((list) =>
      list.map((f) => (f.id === id ? { ...f, enabled } : f))
    );
  }

  onSaveClick(): void {
    this.confirmVisible.set(true);
  }

  onConfirm(result: ConfirmationResult): void {
    if (!result.confirmed) {
      this.confirmVisible.set(false);
      return;
    }
    const list = this.localFeatures();
    list.forEach((f) => this.config.setFeatureEnabled(f.id, f.enabled));
    this.initialFeatures.set([...list.map((f) => ({ ...f }))]);
    this.confirmVisible.set(false);
  }

  onCancelConfirm(): void {
    this.confirmVisible.set(false);
  }
}
