import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MerchantService, Merchant, MerchantType, MerchantPerformance } from '../services/merchant.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { PerformanceCardComponent } from '../../../shared/components/performance-card/performance-card.component';
import { RegionSelectorComponent } from '../../../shared/components/region-selector/region-selector.component';
import { ConfirmationModalComponent } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';

interface TypeOption {
  label: string;
  value: MerchantType;
}

@Component({
  selector: 'app-merchant-details',
  imports: [
    CommonModule,
    RouterModule,
    StatusBadgeComponent,
    PerformanceCardComponent,
    RegionSelectorComponent,
    ConfirmationModalComponent,
    ButtonModule,
    ToastModule,
    SelectModule,
    FormsModule
  ],
  templateUrl: './merchant-details.component.html',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MerchantDetailsComponent implements OnInit {
  private merchantService = inject(MerchantService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private messageService = inject(MessageService);

  merchant = signal<Merchant | null>(null);
  performance = signal<MerchantPerformance | null>(null);

  // Modal states
  showApproveModal = signal(false);
  showSuspendModal = signal(false);
  showReactivateModal = signal(false);
  showChangeTypeModal = signal(false);
  showAssignRegionsModal = signal(false);

  // Change type state
  selectedType = signal<MerchantType | null>(null);
  typeOptions: TypeOption[] = [
    { label: 'Regional', value: 'Regional' },
    { label: 'National', value: 'National' },
    { label: 'Global', value: 'Global' }
  ];

  // Assign regions state
  selectedRegions = signal<string[]>([]);
  availableRegions = this.merchantService.regions;

  // Computed properties
  canApprove = computed(() => this.merchant()?.status === 'Pending');
  canSuspend = computed(() => this.merchant()?.status === 'Approved');
  canReactivate = computed(() => this.merchant()?.status === 'Suspended');
  isSuspended = computed(() => this.merchant()?.status === 'Suspended');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const merchant = this.merchantService.getMerchantById(id);
      if (merchant) {
        this.merchant.set(merchant);
        this.performance.set(this.merchantService.getPerformance(id));
        this.selectedRegions.set([...merchant.region]);
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Not Found',
          detail: 'Merchant not found'
        });
        this.router.navigate(['/admin/merchants']);
      }
    }
  }

  // Action handlers
  onApprove() {
    this.showApproveModal.set(true);
  }

  onSuspend() {
    this.showSuspendModal.set(true);
  }

  onReactivate() {
    this.showReactivateModal.set(true);
  }

  onChangeType() {
    const currentType = this.merchant()?.type;
    if (currentType) {
      this.selectedType.set(currentType);
    }
    this.showChangeTypeModal.set(true);
  }

  onAssignRegions() {
    this.showAssignRegionsModal.set(true);
  }

  // Confirmation handlers
  handleApproveConfirm(event: { confirmed: boolean; reason?: string }) {
    if (event.confirmed) {
      const id = this.merchant()?.id;
      if (id && this.merchantService.approveMerchant(id)) {
        const updated = this.merchantService.getMerchantById(id);
        if (updated) {
          this.merchant.set(updated);
        }
        this.messageService.add({
          severity: 'success',
          summary: 'Merchant Approved',
          detail: 'The merchant has been approved successfully'
        });
      }
    }
    this.showApproveModal.set(false);
  }

  handleSuspendConfirm(event: { confirmed: boolean; reason?: string }) {
    if (event.confirmed && event.reason) {
      const id = this.merchant()?.id;
      if (id && this.merchantService.suspendMerchant(id, event.reason)) {
        const updated = this.merchantService.getMerchantById(id);
        if (updated) {
          this.merchant.set(updated);
        }
        this.messageService.add({
          severity: 'warn',
          summary: 'Merchant Suspended',
          detail: 'The merchant has been suspended'
        });
      }
    }
    this.showSuspendModal.set(false);
  }

  handleReactivateConfirm(event: { confirmed: boolean; reason?: string }) {
    if (event.confirmed) {
      const id = this.merchant()?.id;
      if (id && this.merchantService.reactivateMerchant(id)) {
        const updated = this.merchantService.getMerchantById(id);
        if (updated) {
          this.merchant.set(updated);
        }
        this.messageService.add({
          severity: 'success',
          summary: 'Merchant Reactivated',
          detail: 'The merchant has been reactivated successfully'
        });
      }
    }
    this.showReactivateModal.set(false);
  }

  handleChangeTypeConfirm(event: { confirmed: boolean; reason?: string }) {
    if (event.confirmed) {
      const id = this.merchant()?.id;
      const newType = this.selectedType();
      if (id && newType && this.merchantService.updateMerchantType(id, newType)) {
        const updated = this.merchantService.getMerchantById(id);
        if (updated) {
          this.merchant.set(updated);
        }
        this.messageService.add({
          severity: 'info',
          summary: 'Type Updated',
          detail: `Merchant type changed to ${newType}`
        });
      }
    }
    this.showChangeTypeModal.set(false);
  }

  handleAssignRegionsConfirm(event: { confirmed: boolean; reason?: string }) {
    if (event.confirmed) {
      const id = this.merchant()?.id;
      const regions = this.selectedRegions();
      if (id && regions.length > 0 && this.merchantService.assignRegions(id, regions)) {
        const updated = this.merchantService.getMerchantById(id);
        if (updated) {
          this.merchant.set(updated);
        }
        this.messageService.add({
          severity: 'info',
          summary: 'Regions Updated',
          detail: 'Merchant regions have been updated'
        });
      }
    }
    this.showAssignRegionsModal.set(false);
  }

  handleModalCancel(modalName: 'approve' | 'suspend' | 'reactivate' | 'changeType' | 'assignRegions') {
    switch (modalName) {
      case 'approve':
        this.showApproveModal.set(false);
        break;
      case 'suspend':
        this.showSuspendModal.set(false);
        break;
      case 'reactivate':
        this.showReactivateModal.set(false);
        break;
      case 'changeType':
        this.showChangeTypeModal.set(false);
        break;
      case 'assignRegions':
        this.showAssignRegionsModal.set(false);
        break;
    }
  }

  onRegionsChange(regions: string[]) {
    this.selectedRegions.set(regions);
  }

  // Utility methods
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTypeIcon(type: MerchantType): string {
    switch (type) {
      case 'Regional': return 'pi pi-map-marker';
      case 'National': return 'pi pi-flag';
      case 'Global': return 'pi pi-globe';
      default: return 'pi pi-store';
    }
  }
}
