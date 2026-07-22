import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PermissionService } from '../../../core/services/permission.service';
import { InfoBannerComponent } from '../../../shared/components/info-banner/info-banner.component';
import { CompanyBankAccountComponent } from './company-bank-account.component';

@Component({
  selector: 'app-general-settings',
  imports: [CommonModule, InfoBannerComponent, CompanyBankAccountComponent],
  templateUrl: './general-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeneralSettingsComponent {
  protected permission = inject(PermissionService);

  isViewOnly = computed(() => !this.permission.hasPermission('system.edit_general'));
}
