import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MerchantService, Merchant, MerchantStatus } from '../services/merchant.service';
import {
  MerchantAllocationService,
  MerchantAllocation,
  AllocationStatus,
  HandoverStatus,
} from '../services/merchant-allocation.service';
import { AdminProductsService } from '../../products/services/admin-products.service';
import { Product } from '../../../core/models/product.model';
import { MerchantCategoryConfigService } from '../services/merchant-category-config.service';
import { MerchantCategoryType } from '../../../core/models/merchant-category-config.model';
import {
  MerchantStockBalanceDetail,
  MerchantStockBalanceService,
} from '../services/merchant-stock-balance.service';
import { PermissionService } from '../../../core/services/permission.service';
import { Feature, Action } from '../../../core/models/admin-permission.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ConfirmationModalComponent } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-merchant-details',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    StatusBadgeComponent,
    ConfirmationModalComponent,
    HasPermissionDirective,
    ButtonModule,
    ToastModule,
    TooltipModule,
    DialogModule
  ],
  templateUrl: './merchant-details.component.html',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MerchantDetailsComponent implements OnInit {
  private merchantService = inject(MerchantService);
  private allocationService = inject(MerchantAllocationService);
  private stockBalanceService = inject(MerchantStockBalanceService);
  private productService = inject(AdminProductsService);
  private categoryConfigService = inject(MerchantCategoryConfigService);
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
  showRefillModal = signal(false);
  showAssignProductModal = signal(false);
  showRemoveProductModal = signal(false);
  showDispatchModal = signal(false);
  showInTransitModal = signal(false);
  showDeliveredModal = signal(false);

  // Action loading states
  approveLoading = signal(false);
  rejectLoading = signal(false);
  suspendLoading = signal(false);
  reactivateLoading = signal(false);
  refillLoading = signal(false);
  assignProductLoading = signal(false);
  removeProductLoading = signal(false);
  dispatchLoading = signal(false);
  statusUpdateLoading = signal(false);

  // Allocations
  allocations = signal<MerchantAllocation[]>([]);
  allocationsLoading = signal(false);
  selectedAllocation = signal<MerchantAllocation | null>(null);
  dispatchNotes = signal('');
  trackingReference = signal('');

  stockBalance = signal<MerchantStockBalanceDetail | null>(null);
  stockBalanceLoading = signal(false);

  // Product management state
  selectedProduct = signal<Product | null>(null);
  availableProducts = computed(() => {
    const allProducts = this.productService.products();
    const assignedIds = new Set(this.merchant()?.products.map(p => p.productId) ?? []);
    // Filter to show only ACTIVE products not already assigned
    return allProducts.filter(p => p.status === 'ACTIVE' && !assignedIds.has(p.id));
  });
  loadingProducts = this.productService.loadingProducts;
  productToRemove = signal<{ id: string; name: string } | null>(null);
  categoryConfigs = this.categoryConfigService.configs;
  loadingCategoryConfigs = this.categoryConfigService.loading;

  private merchantCategoryType = computed<MerchantCategoryType | null>(() => {
    const type = this.merchant()?.type;
    if (type === 'REGIONAL' || type === 'NATIONAL' || type === 'GLOBAL') {
      return type;
    }
    return null;
  });

  /** Resolved category config for this merchant's tier (REGIONAL/NATIONAL/GLOBAL). */
  merchantCategoryConfig = computed(() => {
    const type = this.merchantCategoryType();
    if (!type) return null;
    return this.categoryConfigs().find((c) => c.merchantType === type) ?? null;
  });

  poolShortages = computed(() => {
    const categoryType = this.merchantCategoryType();
    if (!categoryType) return [] as Array<{ productId: string; productName: string; required: number; available: number; shortBy: number }>;

    const config = this.categoryConfigs().find((c) => c.merchantType === categoryType);
    if (!config || !Array.isArray(config.onboardingItems) || config.onboardingItems.length === 0) {
      return [] as Array<{ productId: string; productName: string; required: number; available: number; shortBy: number }>;
    }

    const products = this.productService.products();
    return config.onboardingItems
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        const available = Math.max(0, Number(product?.adminPoolQuantity ?? 0));
        const required = Math.max(0, Number(item.quantity ?? 0));
        const shortBy = required - available;
        return {
          productId: item.productId,
          productName: product?.name ?? item.productId,
          required,
          available,
          shortBy,
        };
      })
      .filter((row) => row.shortBy > 0);
  });

  hasPoolShortage = computed(() => this.poolShortages().length > 0);
  canPrecheckPool = computed(() => !!this.merchantCategoryType());
  isPoolBlockingRefill = computed(() => this.canRefill() && this.canPrecheckPool() && this.hasPoolShortage());

  // Computed
  canApprove = computed(() => this.merchant()?.status === 'PENDING');
  canReject = computed(() => this.merchant()?.status === 'PENDING');
  canSuspend = computed(() => this.merchant()?.status === 'ACTIVE');
  canReactivate = computed(() => this.merchant()?.status === 'SUSPENDED');
  canRefill = computed(() => this.merchant()?.status === 'ACTIVE');
  isSuspended = computed(() => this.merchant()?.status === 'SUSPENDED');

  ngOnInit() {
    // Show view-only toast if applicable
    if (this.isViewOnly()) {
      this.messageService.add({
        severity: 'info',
        summary: 'View-Only Mode',
        detail: 'You have view-only access. Contact an administrator for changes.'
      });
    }

    // Load products and category config for pool sufficiency checks and assignment actions
    this.productService.loadProducts({ limit: 500, offset: 0 }).subscribe();
    this.categoryConfigService.loadConfigs().subscribe();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loading.set(true);
      this.merchantService.loadMerchant(id).subscribe(m => {
        this.loading.set(false);
        if (m) {
          this.merchant.set(m);
          this.loadAllocations(id);
          if (m.status === 'ACTIVE') {
            this.loadStockBalance(id);
          }
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
    this.loadAllocations(id);
  }

  private loadAllocations(merchantId: string): void {
    this.allocationsLoading.set(true);
    this.allocationService.getAllocations(merchantId).subscribe({
      next: (rows) => {
        this.allocations.set(rows);
        this.allocationsLoading.set(false);
      },
      error: () => {
        this.allocations.set([]);
        this.allocationsLoading.set(false);
      },
    });
  }

  private loadStockBalance(merchantId: string): void {
    this.stockBalanceLoading.set(true);
    this.stockBalanceService.getMerchantStockBalance(merchantId).subscribe({
      next: (detail) => {
        this.stockBalance.set(detail);
        this.stockBalanceLoading.set(false);
      },
      error: () => {
        this.stockBalance.set(null);
        this.stockBalanceLoading.set(false);
      },
    });
  }

  // Allocation actions
  onDispatch(allocation: MerchantAllocation): void {
    this.selectedAllocation.set(allocation);
    this.dispatchNotes.set('');
    this.trackingReference.set('');
    this.showDispatchModal.set(true);
  }

  onMarkInTransit(allocation: MerchantAllocation): void {
    this.selectedAllocation.set(allocation);
    this.showInTransitModal.set(true);
  }

  onMarkDelivered(allocation: MerchantAllocation): void {
    this.selectedAllocation.set(allocation);
    this.showDeliveredModal.set(true);
  }

  handleDispatchConfirm(): void {
    const merchantId = this.merchant()?.id;
    const allocation = this.selectedAllocation();
    if (!merchantId || !allocation) return;

    this.dispatchLoading.set(true);
    this.allocationService
      .dispatchAllocation(merchantId, allocation.id, {
        dispatchNotes: this.dispatchNotes().trim() || undefined,
        trackingReference: this.trackingReference().trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.dispatchLoading.set(false);
          this.showDispatchModal.set(false);
          this.selectedAllocation.set(null);
          this.loadAllocations(merchantId);
          this.messageService.add({
            severity: 'success',
            summary: 'Stock Dispatched',
            detail: `${allocation.productName} has been dispatched to the merchant.`,
          });
        },
        error: (err) => {
          this.dispatchLoading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Dispatch Failed',
            detail: err?.error?.message ?? 'Failed to dispatch allocation',
          });
        },
      });
  }

  handleInTransitConfirm(event: { confirmed: boolean }): void {
    if (event.confirmed) {
      this.updateAllocationStatus('IN_TRANSIT');
    }
    this.showInTransitModal.set(false);
  }

  handleDeliveredConfirm(event: { confirmed: boolean }): void {
    if (event.confirmed) {
      this.updateAllocationStatus('DELIVERED');
    }
    this.showDeliveredModal.set(false);
  }

  private updateAllocationStatus(status: 'IN_TRANSIT' | 'DELIVERED'): void {
    const merchantId = this.merchant()?.id;
    const allocation = this.selectedAllocation();
    if (!merchantId || !allocation) return;

    this.statusUpdateLoading.set(true);
    this.allocationService.updateAllocationStatus(merchantId, allocation.id, status).subscribe({
      next: () => {
        this.statusUpdateLoading.set(false);
        this.selectedAllocation.set(null);
        this.loadAllocations(merchantId);
        const label = status === 'IN_TRANSIT' ? 'In Transit' : 'Delivered';
        this.messageService.add({
          severity: 'success',
          summary: 'Status Updated',
          detail: `Allocation marked as ${label}.`,
        });
      },
      error: (err) => {
        this.statusUpdateLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Update Failed',
          detail: err?.error?.message ?? 'Failed to update allocation status',
        });
      },
    });
  }

  handleDispatchCancel(): void {
    this.showDispatchModal.set(false);
    this.selectedAllocation.set(null);
    this.dispatchNotes.set('');
    this.trackingReference.set('');
  }

  canDispatch(allocation: MerchantAllocation): boolean {
    if (allocation.status !== 'PENDING') return false;
    return !this.allocationService.isHandoverBlockingDispatch(allocation.handoverStatus);
  }

  isHandoverBlocking(allocation: MerchantAllocation): boolean {
    return (
      allocation.status === 'PENDING' &&
      this.allocationService.isHandoverBlockingDispatch(allocation.handoverStatus)
    );
  }

  hasActiveHandover(allocation: MerchantAllocation): boolean {
    const status = allocation.handoverStatus;
    return !!status && status !== 'NONE';
  }

  canMarkInTransit(allocation: MerchantAllocation): boolean {
    return allocation.status === 'DISPATCHED';
  }

  canMarkDelivered(allocation: MerchantAllocation): boolean {
    return allocation.status === 'IN_TRANSIT';
  }

  getAllocationStatusLabel(status: AllocationStatus): string {
    return this.allocationService.getAllocationStatusLabel(status);
  }

  getHandoverStatusLabel(status: HandoverStatus): string {
    return this.allocationService.getHandoverStatusLabel(status);
  }

  getHandoverStatusClass(status: HandoverStatus): string {
    const map: Record<HandoverStatus, string> = {
      NONE: 'bg-gray-50 text-gray-500 border-gray-200',
      REQUESTED: 'bg-amber-50 text-amber-700 border-amber-200',
      SUPPLIER_APPROVED: 'bg-blue-50 text-blue-700 border-blue-200',
      ADMIN_APPROVED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      READY_FOR_PICKUP: 'bg-purple-50 text-purple-700 border-purple-200',
      COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      REJECTED: 'bg-red-50 text-red-700 border-red-200',
    };
    return map[status] ?? 'bg-gray-50 text-gray-500 border-gray-200';
  }

  getAllocationStatusClass(status: AllocationStatus): string {
    const map: Record<AllocationStatus, string> = {
      PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
      DISPATCHED: 'bg-blue-50 text-blue-700 border-blue-200',
      IN_TRANSIT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      DELIVERED: 'bg-purple-50 text-purple-700 border-purple-200',
      RECEIVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      CANCELLED: 'bg-gray-50 text-gray-500 border-gray-200',
    };
    return map[status] ?? 'bg-gray-50 text-gray-500 border-gray-200';
  }

  formatAllocationDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Action openers
  onApprove() {
    this.showApproveModal.set(true);
  }
  onReject() { this.showRejectModal.set(true); }
  onSuspend() { this.showSuspendModal.set(true); }
  onReactivate() { this.showReactivateModal.set(true); }
  onRefill() {
    if (this.isPoolBlockingRefill()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Insufficient Admin Pool',
        detail: 'Top up admin pool stock for onboarding products before refilling this merchant.'
      });
      return;
    }
    this.showRefillModal.set(true);
  }
  onAssignProduct() { 
    this.selectedProduct.set(null);
    this.showAssignProductModal.set(true); 
  }
  onRemoveProduct(productId: string, productName: string) {
    this.productToRemove.set({ id: productId, name: productName });
    this.showRemoveProductModal.set(true);
  }

  onAssignProductSelectionChange(event: Event): void {
    const productId = (event.target as HTMLSelectElement).value;
    const product = this.availableProducts().find(p => p.id === productId) ?? null;
    this.selectedProduct.set(product);
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
      const productId = this.selectedProduct()?.id;
      if (merchantId && productId) {
        this.assignProductLoading.set(true);
        this.merchantService.assignProduct(merchantId, productId).subscribe({
          next: () => {
            this.assignProductLoading.set(false);
            this.showAssignProductModal.set(false);
            this.refreshMerchant(merchantId);
            this.messageService.add({ severity: 'success', summary: 'Product Assigned', detail: 'Product has been assigned to merchant' });
          },
          error: (err) => {
            this.assignProductLoading.set(false);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to assign product' });
          }
        });
      } else {
        this.showAssignProductModal.set(false);
      }
    } else {
      this.showAssignProductModal.set(false);
    }
  }

  handleRefillConfirm(event: { confirmed: boolean; reason?: string }) {
    if (event.confirmed) {
      const id = this.merchant()?.id;
      if (id) {
        this.refillLoading.set(true);
        this.merchantService.refillMerchant(id).subscribe({
          next: (res) => {
            this.refillLoading.set(false);
            this.refreshMerchant(id);
            const allocationsCount = Array.isArray(res?.allocationIds) ? res.allocationIds.length : 0;
            this.messageService.add({
              severity: 'success',
              summary: 'Merchant Refilled',
              detail: allocationsCount > 0
                ? `Refill created ${allocationsCount} allocation(s)`
                : (res?.message ?? 'Merchant refill completed successfully')
            });
            this.loadAllocations(id);
          },
          error: (err) => {
            this.refillLoading.set(false);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to refill merchant' });
          }
        });
      }
    }
    this.showRefillModal.set(false);
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
            this.showRemoveProductModal.set(false);
            this.productToRemove.set(null);
            this.refreshMerchant(merchantId);
            this.messageService.add({ severity: 'success', summary: 'Product Removed', detail: 'Product has been removed from merchant' });
          },
          error: (err) => {
            this.removeProductLoading.set(false);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to remove product' });
          }
        });
      }
    } else {
      this.showRemoveProductModal.set(false);
      this.productToRemove.set(null);
    }
  }

  handleModalCancel(modalName: 'approve' | 'reject' | 'suspend' | 'reactivate' | 'refill' | 'assignProduct' | 'removeProduct') {
    switch (modalName) {
      case 'approve': this.showApproveModal.set(false); break;
      case 'reject': this.showRejectModal.set(false); break;
      case 'suspend': this.showSuspendModal.set(false); break;
      case 'reactivate': this.showReactivateModal.set(false); break;
      case 'refill': this.showRefillModal.set(false); break;
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
