import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ConfirmationModalComponent, ConfirmationResult } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { SystemConfigService } from '../services/system-config.service';

@Component({
  selector: 'app-currency-localization',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    SelectModule,
    ConfirmationModalComponent,
  ],
  templateUrl: './currency-localization.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencyLocalizationComponent {
  private fb = inject(FormBuilder);
  protected config = inject(SystemConfigService);

  confirmVisible = signal(false);
  initialLocale = signal('');
  initialTimezone = signal('');

  form = this.fb.group({
    locale: ['en-US'],
    timezone: ['UTC'],
  });

  localeControl = this.form.get('locale') as FormControl<string>;
  timezoneControl = this.form.get('timezone') as FormControl<string>;

  localeOptions = [
    { label: 'English (US)', value: 'en-US' },
    { label: 'English (GB)', value: 'en-GB' },
    { label: 'French', value: 'fr-FR' },
    { label: 'Spanish', value: 'es-ES' },
  ];
  timezoneOptions = [
    { label: 'UTC', value: 'UTC' },
    { label: 'Africa/Lagos', value: 'Africa/Lagos' },
    { label: 'America/New_York', value: 'America/New_York' },
    { label: 'Europe/London', value: 'Europe/London' },
  ];

  lastModified = computed(() => {
    const cfg = this.config.currency();
    return cfg.lastModified ? new Date(cfg.lastModified).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : null;
  });
  lastModifiedBy = computed(() => this.config.currency().lastModifiedBy ?? null);

  isDirty = computed(() => {
    const loc = this.form.get('locale')?.value ?? '';
    const tz = this.form.get('timezone')?.value ?? '';
    return loc !== this.initialLocale() || tz !== this.initialTimezone();
  });

  constructor() {
    effect(() => {
      const c = this.config.currency();
      this.initialLocale.set(c.locale);
      this.initialTimezone.set(c.timezone);
      this.form.patchValue({ locale: c.locale, timezone: c.timezone }, { emitEvent: false });
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
    const v = this.form.value;
    this.config.setCurrency({
      locale: v.locale ?? 'en-US',
      timezone: v.timezone ?? 'UTC',
      lastModified: new Date().toISOString(),
      lastModifiedBy: 'Admin',
    });
    this.initialLocale.set(v.locale ?? 'en-US');
    this.initialTimezone.set(v.timezone ?? 'UTC');
    this.confirmVisible.set(false);
  }

  onCancelConfirm(): void {
    this.confirmVisible.set(false);
  }
}
