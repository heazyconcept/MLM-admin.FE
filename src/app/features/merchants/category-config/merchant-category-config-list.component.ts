import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MerchantCategoryConfigService } from '../services/merchant-category-config.service';
import {
  MerchantCategoryConfig,
  MerchantCategoryType,
} from '../../../core/models/merchant-category-config.model';
import { PermissionService } from '../../../core/services/permission.service';
import { Feature } from '../../../core/models/admin-permission.model';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-merchant-category-config-list',
  imports: [CommonModule, RouterModule, ButtonModule, TooltipModule, ToastModule],
  providers: [MessageService],
  templateUrl: './merchant-category-config-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MerchantCategoryConfigListComponent implements OnInit {
getCardAccentClass(arg0: string): string|string[]|Set<string>|{ [klass: string]: any; }|null|undefined {
throw new Error('Method not implemented.');
}
  private configService = inject(MerchantCategoryConfigService);
  private permission = inject(PermissionService);
  private router = inject(Router);
  private messageService = inject(MessageService);

  configs = this.configService.configs;
  loading = this.configService.loading;
  error = this.configService.error;

  canEdit = computed(() => this.permission.canEdit(Feature.Merchants));

  readonly allTypes: MerchantCategoryType[] = ['REGIONAL', 'NATIONAL', 'GLOBAL'];

  /** Order configs by type for consistent display */
  orderedConfigs = computed(() => {
    const order: MerchantCategoryType[] = ['REGIONAL', 'NATIONAL', 'GLOBAL'];
    const configs = this.configs();
    return order
      .map((type) => configs.find((c) => c.merchantType === type))
      .filter((c): c is MerchantCategoryConfig => !!c);
  });

  /** Types that have no config yet */
  unconfiguredTypes = computed(() => {
    const configured = new Set(this.configs().map((c) => c.merchantType));
    return this.allTypes.filter((t) => !configured.has(t));
  });

getAccentStripClass(type: string): string {
  const map: Record<string, string> = {
    REGIONAL: 'bg-brand-green-primary',  // #49A321
    NATIONAL: 'bg-brand-gold',           // #F9A825
    GLOBAL:   'bg-brand-green-dark',     // #1B5E20
  };
  return map[type?.toUpperCase()] ?? 'bg-slate-300';
}


  /** True when API returned an empty array (none of the 3 types configured) */
  isFullyEmpty = computed(() => !this.loading() && this.configs().length === 0 && !this.error());

  ngOnInit() {
    this.configService.loadConfigs().subscribe(() => {
      // Show info toast if no configs exist yet
      if (this.isFullyEmpty()) {
        this.messageService.add({
          severity: 'info',
          summary: 'No Configuration',
          detail: 'No config yet. Set values for each merchant type below and click Save to create the configuration.'
        });
      }
    });
  }

  reload() {
    this.configService.loadConfigs().subscribe();
  }

  editConfig(config: MerchantCategoryConfig) {
    this.router.navigate(['/admin/merchants/category-config', config.merchantType]);
  }

  setupType(type: MerchantCategoryType) {
    this.router.navigate(['/admin/merchants/category-config', type]);
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

  getTypeBgColor(type: MerchantCategoryType): string {
    const map: Record<MerchantCategoryType, string> = {
      REGIONAL: 'bg-blue-50',
      NATIONAL: 'bg-amber-50',
      GLOBAL: 'bg-emerald-50',
    };
    return map[type] ?? 'bg-gray-50';
  }

  getTypeIconColor(type: MerchantCategoryType): string {
    const map: Record<MerchantCategoryType, string> = {
      REGIONAL: 'text-blue-600',
      NATIONAL: 'text-amber-600',
      GLOBAL: 'text-emerald-600',
    };
    return map[type] ?? 'text-gray-600';
  }

  getTypeBorderColor(type: MerchantCategoryType): string {
    const map: Record<MerchantCategoryType, string> = {
      REGIONAL: 'border-blue-200',
      NATIONAL: 'border-amber-200',
      GLOBAL: 'border-emerald-200',
    };
    return map[type] ?? 'border-gray-200';
  }

  formatFee(fee: number | null): string {
    if (fee === null) return 'System default';
    return `₦${fee.toLocaleString()}`;
  }

  formatPV(pv: number | null, type: MerchantCategoryType): string {
    if (pv === null) {
      const defaults: Record<MerchantCategoryType, number> = {
        REGIONAL: 100,
        NATIONAL: 320,
        GLOBAL: 1200,
      };
      const def = defaults[type] ?? 0;
      return `${def.toLocaleString()} (Default)`;
    }
    return pv.toLocaleString();
  }

  formatPct(value: number): string {
    return `${value}%`;
  }
}
