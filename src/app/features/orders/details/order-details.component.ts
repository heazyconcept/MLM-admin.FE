import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit, DestroyRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';

// App
import { AdminOrdersService } from '../services/admin-orders.service';
import { MerchantService, Merchant } from '../../merchants/services/merchant.service';
import { InfoBannerComponent } from '../../../shared/components/info-banner/info-banner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { Order, OrderStatus, FulfilmentMode, CustomerType } from '../../../core/models/order.model';
import { PermissionService } from '../../../core/services/permission.service';
import { Feature, Action } from '../../../core/models/admin-permission.model';

@Component({
  selector: 'app-order-details',
  imports: [
    CommonModule,
    FormsModule,
    InfoBannerComponent,
    StatusBadgeComponent,
    ButtonModule,
    TagModule,
    SelectModule,
    TooltipModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './order-details.component.html',
  styleUrls: ['./order-details.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private ordersService = inject(AdminOrdersService);
  private merchantService = inject(MerchantService);
  private messageService = inject(MessageService);
  private destroyRef = inject(DestroyRef);
  protected permission = inject(PermissionService);

  // Permission checks
  canAssignMerchant = computed(
    () => this.permission.canEdit(Feature.OrdersLogistics) && this.permission.canPerform(Action.UpdateOrderStatus)
  );
  isViewOnly = computed(() => !this.permission.canEdit(Feature.OrdersLogistics));

  // State
  order = this.ordersService.selectedOrder;
  loadingDetail = this.ordersService.loadingDetail;
  loadError = this.ordersService.error;
  assigning = this.ordersService.assigning;
  markSentLoading = signal(false);
  confirmDeliveryLoading = signal(false);
  deliveryProof = signal('');
  deliveryNotes = signal('');

  // Merchant picker state
  merchants = this.merchantService.merchants;
  loadingMerchants = this.merchantService.loading;
  selectedMerchantId = signal<string | null>(null);

  merchantOptions = computed(() =>
    this.merchants()
      .filter((m) => m.status === 'ACTIVE')
      .map((m) => ({
        label: this.merchantService.getMerchantDisplayName(m) + ` (${m.user.email})`,
        value: m.id,
      }))
  );

  // Can assign? Only OFFLINE_DELIVERY + (PAID or ASSIGNED_TO_MERCHANT)
  canShowAssign = computed(() => {
    const o = this.order();
    if (!o) return false;
    return (
      o.fulfilmentMode === 'OFFLINE_DELIVERY' &&
      (o.status === 'PAID' || o.status === 'ASSIGNED_TO_MERCHANT') &&
      this.canAssignMerchant()
    );
  });

  canShowDeliveryActions = computed(() => {
    const o = this.order();
    if (!o) return false;
    return (
      o.fulfilmentMode === 'OFFLINE_DELIVERY' &&
      !!o.assignedMerchantId &&
      this.canAssignMerchant()
    );
  });

  canMarkSent = computed(() => {
    const o = this.order();
    if (!o) return false;
    return this.canShowDeliveryActions() && !o.sentAt;
  });

  canConfirmDelivery = computed(() => {
    const o = this.order();
    if (!o) return false;
    return this.canShowDeliveryActions() && !!o.sentAt && !o.receivedAt;
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.selectedMerchantId.set(null);
        this.ordersService.loadOrder(id).subscribe();
        // Load active merchants for the assign-merchant picker
        this.merchantService.loadMerchants({ status: 'ACTIVE', limit: 500 }).subscribe();
      }
    });
  }

  goBack(): void {
    this.location.back();
  }

  onAssignMerchant(): void {
    const order = this.order();
    const merchantId = this.selectedMerchantId();
    if (!order || !merchantId) return;

    this.ordersService.assignMerchant(order.id, merchantId).subscribe((res) => {
      if (res) {
        this.messageService.add({
          severity: 'success',
          summary: 'Merchant Assigned',
          detail: res.message || 'Merchant assigned to order successfully.',
        });
        // Refresh order details
        this.ordersService.loadOrder(order.id).subscribe();
        this.selectedMerchantId.set(null);
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Assignment Failed',
          detail: this.ordersService.error() || 'Failed to assign merchant.',
        });
      }
    });
  }

  onRetry(): void {
    const order = this.order();
    if (order) {
      this.ordersService.loadOrder(order.id).subscribe();
    }
  }

  onMarkSent(): void {
    const order = this.order();
    const merchantId = order?.assignedMerchantId;
    if (!order || !merchantId || this.markSentLoading()) return;

    this.markSentLoading.set(true);
    this.merchantService.markOrderSent(merchantId, order.id).subscribe({
      next: (res) => {
        this.markSentLoading.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Order Marked Sent',
          detail: res?.message || 'Order was marked as sent successfully.',
        });
        this.ordersService.loadOrder(order.id).subscribe();
      },
      error: (err) => {
        this.markSentLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Action Failed',
          detail: err?.error?.message || 'Failed to mark order as sent.',
        });
      },
    });
  }

  onConfirmDelivery(): void {
    const order = this.order();
    const merchantId = order?.assignedMerchantId;
    if (!order || !merchantId || this.confirmDeliveryLoading()) return;

    const proof = this.deliveryProof().trim();
    const notes = this.deliveryNotes().trim();
    const body = {
      ...(proof ? { proof } : {}),
      ...(notes ? { notes } : {}),
    };

    this.confirmDeliveryLoading.set(true);
    this.merchantService.confirmDelivery(merchantId, order.id, body).subscribe({
      next: (res) => {
        this.confirmDeliveryLoading.set(false);
        this.deliveryProof.set('');
        this.deliveryNotes.set('');
        this.messageService.add({
          severity: 'success',
          summary: 'Delivery Confirmed',
          detail: res?.message || 'Order delivery confirmed successfully.',
        });
        this.ordersService.loadOrder(order.id).subscribe();
      },
      error: (err) => {
        this.confirmDeliveryLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Action Failed',
          detail: err?.error?.message || 'Failed to confirm delivery.',
        });
      },
    });
  }

  // ── Display helpers ────────────────────────────────────────

  getStatusLabel(status: OrderStatus): string {
    return this.ordersService.getStatusLabel(status);
  }

  getStatusSeverity(status: OrderStatus) {
    return this.ordersService.getStatusSeverity(status);
  }

  getFulfilmentLabel(mode: FulfilmentMode): string {
    return this.ordersService.getFulfilmentLabel(mode);
  }

  getCustomerTypeLabel(type: CustomerType): string {
    return this.ordersService.getCustomerTypeLabel(type);
  }

  getUserDisplayName(user: { email: string; firstName?: string; lastName?: string } | null | undefined): string {
    return this.ordersService.getUserDisplayName(user);
  }

  getOrderCustomerName(order: Order): string {
    return this.ordersService.getOrderCustomerName(order);
  }

  getOrderCustomerEmail(order: Order): string {
    return this.ordersService.getOrderCustomerEmail(order);
  }

  getItemsTotal(): number {
    const o = this.order();
    if (!o) return 0;
    return o.items.reduce((sum, item) => sum + item.lineTotal, 0);
  }

  getAssignedMerchantName(): string {
    const o = this.order();
    if (!o?.assignedMerchantId) return 'Not assigned';
    const merchant = this.merchants().find((m) => m.id === o.assignedMerchantId);
    return merchant ? this.merchantService.getMerchantDisplayName(merchant) : o.assignedMerchantId;
  }
}
