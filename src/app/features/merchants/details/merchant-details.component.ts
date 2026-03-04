import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MerchantService, Merchant, MerchantStatus } from '../services/merchant.service';
import { PermissionService } from '../../../core/services/permission.service';
import { Feature, Action } from '../../../core/models/admin-permission.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { InfoBannerComponent } from '../../../shared/components/info-banner/info-banner.component';
import { ConfirmationModalComponent } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-merchant-details',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    StatusBadgeComponent,
    InfoBannerComponent,
    ConfirmationModalComponent,
    ButtonModule,
    ToastModule,
    TooltipModule
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
  protected permission = inject(PermissionService);

  canApproveMerchant = computed(
    () => this.permission.canEdit(Feature.Merchants) && this.permission.canPerform(Action.ApproveMerchant)
  );
  isViewOnly = computed(() => !this.permission.canEdit(Feature.Merchants));

  merchant = signal<Merchant | null>(null);
  loading = signal(true);

  // Modal states
  showApproveModal = signal(false);
  showRejectModal = signal(false);
  showSuspendModal = signal(false);
  showReactivateModal = signal(false);
  showAssignProductModal = signal(false);
  showRemoveProductModal = signal(false);

  // Action loading states
  approveLoading = signal(false);
  rejectLoading = signal(false);
  suspendLoading = signal(false);
  reactivateLoading = signal(false);
  assignProductLoading = signal(false);
  removeProductLoading = signal(false);

  // Product management state
  selectedProductId = signal<string>('');
  productToRemove = signal<{ id: string; name: string } | null>(null);

  // Computed
  canApprove = computed(() => this.merchant()?.status === 'PENDING');
  canReject = computed(() => this.merchant()?.status === 'PENDING');
  canSuspend = computed(() => this.merchant()?.status === 'ACTIVE');
  canReactivate = computed(() => this.merchant()?.status === 'SUSPENDED');
  isSuspended = computed(() => this.merchant()?.status === 'SUSPENDED');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loading.set(true);
      this.merchantService.loadMerchant(id).subscribe(m => {
        this.loading.set(false);
        if (m) {
          this.merchant.set(m);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Not Found',
            detail: 'Merchant not found'
          });
          this.router.navigate(['/admin/merchants']);
        }
      });
    } else {
      this.loading.set(false);
    }
  }

  private refreshMerchant(id: string): void {
    this.merchantService.loadMerchant(id).subscribe(m => {
      if (m) {
        this.merchant.set(m);
      }
    });
  }

  // Action openers
  onApprove() { this.showApproveModal.set(true); }
  onReject() { this.showRejectModal.set(true); }
  onSuspend() { this.showSuspendModal.set(true); }
  onReactivate() { this.showReactivateModal.set(true); }
  onAssignProduct() { 
    this.selectedProductId.set('');
    this.showAssignProductModal.set(true); 
  }
  onRemoveProduct(productId: string, productName: string) {
    this.productToRemove.set({ id: productId, name: productName });
    this.showRemoveProductModal.set(true);
  }

  // Confirmation handlers
  handleApproveConfirm(event: { confirmed: boolean; reason?: string }) {
    if (event.confirmed) {
      const id = this.merchant()?.id;
      if (id) {
        this.approveLoading.set(true);
        this.merchantService.approveMerchant(id).subscribe({
          next: () => {
            this.approveLoading.set(false);
            this.refreshMerchant(id);
            this.messageService.add({ severity: 'success', summary: 'Merchant Approved', detail: 'The merchant has been approved successfully' });
          },
          error: (err) => {
            this.approveLoading.set(false);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to approve merchant' });
          }
        });
      }
    }
    this.showApproveModal.set(false);
  }

  handleRejectConfirm(event: { confirmed: boolean; reason?: string }) {
    if (event.confirmed && event.reason) {
      const id = this.merchant()?.id;
      if (id) {
        this.rejectLoading.set(true);
        this.merchantService.rejectMerchant(id, event.reason).subscribe({
          next: () => {
            this.rejectLoading.set(false);
            this.refreshMerchant(id);
            this.messageService.add({ severity: 'warn', summary: 'Merchant Rejected', detail: 'The merchant application has been rejected' });
          },
          error: (err) => {
            this.rejectLoading.set(false);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to reject merchant' });
          }
        });
      }
    }
    this.showRejectModal.set(false);
  }

  handleSuspendConfirm(event: { confirmed: boolean; reason?: string }) {
    if (event.confirmed) {
      const id = this.merchant()?.id;
      if (id) {
        this.suspendLoading.set(true);
        this.merchantService.suspendMerchant(id, event.reason).subscribe({
          next: () => {
            this.suspendLoading.set(false);
            this.refreshMerchant(id);
            this.messageService.add({ severity: 'warn', summary: 'Merchant Suspended', detail: 'The merchant has been suspended' });
          },
          error: (err) => {
            this.suspendLoading.set(false);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to suspend merchant' });
          }
        });
      }
    }
    this.showSuspendModal.set(false);
  }

  handleReactivateConfirm(event: { confirmed: boolean; reason?: string }) {
    if (event.confirmed) {
      const id = this.merchant()?.id;
      if (id) {
        this.reactivateLoading.set(true);
        this.merchantService.reactivateMerchant(id).subscribe({
          next: () => {
            this.reactivateLoading.set(false);
            this.refreshMerchant(id);
            this.messageService.add({ severity: 'success', summary: 'Merchant Reactivated', detail: 'The merchant has been reactivated successfully' });
          },
          error: (err) => {
            this.reactivateLoading.set(false);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to reactivate merchant' });
          }
        });
      }
    }
    this.showReactivateModal.set(false);
  }

  handleAssignProductConfirm(event: { confirmed: boolean; reason?: string }) {
    if (event.confirmed) {
      const merchantId = this.merchant()?.id;
      const productId = this.selectedProductId();
      if (merchantId && productId) {
        this.assignProductLoading.set(true);
        this.merchantService.assignProduct(merchantId, productId).subscribe({
          next: () => {
            this.assignProductLoading.set(false);
            this.refreshMerchant(merchantId);
            this.messageService.add({ severity: 'success', summary: 'Product Assigned', detail: 'Product has been assigned to merchant' });
          },
          error: (err) => {
            this.assignProductLoading.set(false);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to assign product' });
          }
        });
      }
    }
    this.showAssignProductModal.set(false);
  }

  handleRemoveProductConfirm(event: { confirmed: boolean; reason?: string }) {
    if (event.confirmed) {
      const merchantId = this.merchant()?.id;
      const product = this.productToRemove();
      if (merchantId && product) {
        this.removeProductLoading.set(true);
        this.merchantService.removeProduct(merchantId, product.id).subscribe({
          next: () => {
            this.removeProductLoading.set(false);
            this.refreshMerchant(merchantId);
            this.messageService.add({ severity: 'success', summary: 'Product Removed', detail: 'Product has been removed from merchant' });
          },
          error: (err) => {
            this.removeProductLoading.set(false);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to remove product' });
          }
        });
      }
    }
    this.showRemoveProductModal.set(false);
    this.productToRemove.set(null);
  }

  handleModalCancel(modalName: 'approve' | 'reject' | 'suspend' | 'reactivate' | 'assignProduct' | 'removeProduct') {
    switch (modalName) {
      case 'approve': this.showApproveModal.set(false); break;
      case 'reject': this.showRejectModal.set(false); break;
      case 'suspend': this.showSuspendModal.set(false); break;
      case 'reactivate': this.showReactivateModal.set(false); break;
      case 'assignProduct': this.showAssignProductModal.set(false); break;
      case 'removeProduct': 
        this.showRemoveProductModal.set(false);
        this.productToRemove.set(null);
        break;
    }
  }

  // Utility methods
  getDisplayName(merchant: Merchant): string {
    return this.merchantService.getMerchantDisplayName(merchant);
  }

  getDisplayStatus(status: MerchantStatus): 'Pending' | 'Active' | 'Suspended' {
    return this.merchantService.getDisplayStatus(status);
  }

  getDisplayType(type: string): string {
    return this.merchantService.getDisplayType(type as any);
  }

  getTypeIcon(type: string): string {
    return type === 'PICKUP_POINT' ? 'pi pi-map-marker' : 'pi pi-truck';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
