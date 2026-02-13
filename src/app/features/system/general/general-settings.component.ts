import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { InputTextModule } from 'primeng/inputtext';
import { PermissionService } from '../../../core/services/permission.service';
import { Feature, Action } from '../../../core/models/admin-permission.model';
import { InfoBannerComponent } from '../../../shared/components/info-banner/info-banner.component';
import { ConfigInputComponent } from '../../../shared/components/config-input/config-input.component';
import { ConfirmationModalComponent, ConfirmationResult } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { SystemConfigService } from '../services/system-config.service';

@Component({
  selector: 'app-general-settings',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    ToggleSwitchModule,
    InputTextModule,
    InfoBannerComponent,
    ConfigInputComponent,
    ConfirmationModalComponent,
  ],
  templateUrl: './general-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeneralSettingsComponent {
  private fb = inject(FormBuilder);
  protected config = inject(SystemConfigService);
  protected permission = inject(PermissionService);

  canChangeSystemConfig = computed(
    () => this.permission.canEdit(Feature.SystemConfig) && this.permission.canPerform(Action.ChangeSystemConfig)
  );
  isViewOnly = computed(() => !this.permission.canEdit(Feature.SystemConfig));

  confirmVisible = signal(false);
  initialMaintenance = signal(false);
  initialSupportContact = signal('');

  form = this.fb.group({
    maintenanceMode: [false],
    supportContact: ['', [Validators.required, Validators.email]],
  });

  maintenanceControl = this.form.get('maintenanceMode') as FormControl<boolean>;
  supportContactControl = this.form.get('supportContact') as FormControl<string>;

  lastModified = computed(() => {
    const cfg = this.config.general();
    if (!cfg.lastModified) return null;
    return new Date(cfg.lastModified).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  });
  lastModifiedBy = computed(() => this.config.general().lastModifiedBy ?? null);

  isDirty = computed(() => {
    const m = this.form.get('maintenanceMode')?.value;
    const s = this.form.get('supportContact')?.value ?? '';
    return m !== this.initialMaintenance() || s !== this.initialSupportContact();
  });

  constructor() {
    effect(() => {
      const g = this.config.general();
      this.initialMaintenance.set(g.maintenanceMode);
      this.initialSupportContact.set(g.supportContact);
      this.form.patchValue(
        { maintenanceMode: g.maintenanceMode, supportContact: g.supportContact },
        { emitEvent: false }
      );
    });
  }

  onSaveClick(): void {
    this.confirmVisible.set(true);
  }

  onConfirm(result: ConfirmationResult): void {
    if (!result.confirmed) {
      this.confirmVisible.set(false);
      return;
    }
    this.config.setGeneral({
      maintenanceMode: this.form.value.maintenanceMode ?? false,
      supportContact: this.form.value.supportContact ?? '',
      lastModified: new Date().toISOString(),
      lastModifiedBy: 'Admin',
    });
    this.initialMaintenance.set(this.form.value.maintenanceMode ?? false);
    this.initialSupportContact.set(this.form.value.supportContact ?? '');
    this.confirmVisible.set(false);
  }

  onCancelConfirm(): void {
    this.confirmVisible.set(false);
  }
}
