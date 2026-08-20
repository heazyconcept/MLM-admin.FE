import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, tap, map, catchError, of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  Order,
  OrderStatus,
  FulfilmentMode,
  CustomerType,
  MerchantRoute,
  AdminOrderFilters,
  AdminOrdersListResponse,
} from '../../../core/models/order.model';

@Injectable({
  providedIn: 'root',
})
export class AdminOrdersService {
  private readonly api = inject(ApiService);

  // ── State ──────────────────────────────────────────────────
  private readonly ordersState = signal<Order[]>([]);
  private readonly selectedOrderState = signal<Order | null>(null);
  private readonly listTotalState = signal<number>(0);
  private readonly loadingState = signal<boolean>(false);
  private readonly loadingDetailState = signal<boolean>(false);
  private readonly errorState = signal<string | null>(null);
  private readonly assigningState = signal<boolean>(false);
  private readonly approvingState = signal<boolean>(false);

  // ── Public readonly signals ────────────────────────────────
  readonly orders = this.ordersState.asReadonly();
  readonly selectedOrder = this.selectedOrderState.asReadonly();
  readonly listTotal = this.listTotalState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly loadingDetail = this.loadingDetailState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly assigning = this.assigningState.asReadonly();
  readonly approving = this.approvingState.asReadonly();

  // ── Computed counts ────────────────────────────────────────
  readonly paidCount = computed(() => this.ordersState().filter((o) => o.status === 'PAID').length);
  readonly assignedCount = computed(() => this.ordersState().filter((o) => o.status === 'ASSIGNED_TO_MERCHANT').length);
  readonly deliveredCount = computed(() => this.ordersState().filter((o) => o.status === 'DELIVERED').length);

  // ────────────────────────────────────────────────────────────
  //  GET /admin/orders
  // ────────────────────────────────────────────────────────────
  loadOrders(filters?: AdminOrderFilters): Observable<{ orders: Order[]; total: number }> {
    this.loadingState.set(true);
    this.errorState.set(null);

    const params: Record<string, string | number> = {};
    if (filters?.userId) params['userId'] = filters.userId;
    if (filters?.status) params['status'] = filters.status;
    if (filters?.fulfilmentMode) params['fulfilmentMode'] = filters.fulfilmentMode;
    if (filters?.selectedMerchantId) params['selectedMerchantId'] = filters.selectedMerchantId;
    if (filters?.customerType) params['customerType'] = filters.customerType;
    if (filters?.merchantRoute) params['merchantRoute'] = filters.merchantRoute;
    if (filters?.productId) params['productId'] = filters.productId;
    if (filters?.fromDate) params['fromDate'] = filters.fromDate;
    if (filters?.toDate) params['toDate'] = filters.toDate;
    if (filters?.limit != null) params['limit'] = filters.limit;
    if (filters?.offset != null) params['offset'] = filters.offset;
    if (filters?.search) params['search'] = filters.search;

    return this.api.get<AdminOrdersListResponse>('admin/orders', params).pipe(
      map((res) => {
        const orders = Array.isArray(res.orders) ? res.orders : [];
        const total = typeof res.total === 'number' ? res.total : orders.length;
        return { orders, total };
      }),
      tap(({ orders, total }) => {
        this.ordersState.set(orders);
        this.listTotalState.set(total);
        this.loadingState.set(false);
      }),
      catchError((err) => {
        this.loadingState.set(false);
        this.errorState.set(err?.error?.message ?? err?.message ?? 'Failed to load orders');
        this.ordersState.set([]);
        this.listTotalState.set(0);
        return of({ orders: [] as Order[], total: 0 });
      })
    );
  }

  // ────────────────────────────────────────────────────────────
  //  GET /admin/orders/:id
  // ────────────────────────────────────────────────────────────
  loadOrder(id: string): Observable<Order | null> {
    this.loadingDetailState.set(true);
    this.errorState.set(null);

    // Preserve locally known assignedMerchantId when GET omits it (backend gap).
    const previousAssignedMerchantId =
      this.selectedOrderState()?.id === id ? this.selectedOrderState()?.assignedMerchantId : null;

    return this.api.get<Order>(`admin/orders/${id}`).pipe(
      map((order) => {
        if (
          order &&
          !order.assignedMerchantId &&
          previousAssignedMerchantId &&
          order.status === 'ASSIGNED_TO_MERCHANT'
        ) {
          return { ...order, assignedMerchantId: previousAssignedMerchantId };
        }
        return order;
      }),
      tap((order) => {
        this.selectedOrderState.set(order);
        this.loadingDetailState.set(false);
      }),
      catchError((err) => {
        this.loadingDetailState.set(false);
        this.selectedOrderState.set(null);
        this.errorState.set(err?.error?.message ?? err?.message ?? 'Failed to load order');
        return of(null);
      })
    );
  }

  // ────────────────────────────────────────────────────────────
  //  POST /admin/orders/:id/assign-merchant
  // ────────────────────────────────────────────────────────────
  assignMerchant(orderId: string, merchantId: string): Observable<{ message: string } | null> {
    this.assigningState.set(true);
    this.errorState.set(null);

    return this.api.post<{ message: string }>(`admin/orders/${orderId}/assign-merchant`, { merchantId }).pipe(
      tap(() => {
        this.assigningState.set(false);
        // Update local state
        this.ordersState.update((list) =>
          list.map((o) =>
            o.id === orderId
              ? { ...o, status: 'ASSIGNED_TO_MERCHANT' as OrderStatus, assignedMerchantId: merchantId }
              : o
          )
        );
        if (this.selectedOrderState()?.id === orderId) {
          this.selectedOrderState.update((o) =>
            o ? { ...o, status: 'ASSIGNED_TO_MERCHANT' as OrderStatus, assignedMerchantId: merchantId } : o
          );
        }
      }),
      catchError((err) => {
        this.assigningState.set(false);
        this.errorState.set(err?.error?.message ?? err?.message ?? 'Failed to assign merchant');
        return of(null);
      })
    );
  }

  // ────────────────────────────────────────────────────────────
  //  POST /admin/orders/:id/approve
  // ────────────────────────────────────────────────────────────
  approveOrder(orderId: string): Observable<{ message: string } | null> {
    this.approvingState.set(true);
    this.errorState.set(null);

    return this.api.post<{ message: string }>(`admin/orders/${orderId}/approve`, {}).pipe(
      tap(() => {
        this.approvingState.set(false);
        // Update local state
        this.ordersState.update((list) =>
          list.map((o) =>
            o.id === orderId ? { ...o, status: 'APPROVED' as OrderStatus } : o
          )
        );
        if (this.selectedOrderState()?.id === orderId) {
          this.selectedOrderState.update((o) =>
            o ? { ...o, status: 'APPROVED' as OrderStatus } : o
          );
        }
      }),
      catchError((err) => {
        this.approvingState.set(false);
        this.errorState.set(err?.error?.message ?? err?.message ?? 'Failed to approve order');
        return of(null);
      })
    );
  }

  // ────────────────────────────────────────────────────────────
  //  POST /admin/orders/:id/mark-sent  (admin-level, no merchant)
  // ────────────────────────────────────────────────────────────
  adminMarkSent(orderId: string): Observable<{ message: string } | null> {
    return this.api.post<{ message: string }>(`admin/orders/${orderId}/mark-sent`, {}).pipe(
      catchError((err) => {
        this.errorState.set(err?.error?.message ?? err?.message ?? 'Failed to mark order as sent');
        return of(null);
      })
    );
  }

  // ────────────────────────────────────────────────────────────
  //  POST /admin/orders/:id/confirm-delivery  (admin-level, no merchant)
  // ────────────────────────────────────────────────────────────
  adminConfirmDelivery(orderId: string, body?: { proof?: string; notes?: string }): Observable<{ message: string } | null> {
    return this.api.post<{ message: string }>(`admin/orders/${orderId}/confirm-delivery`, body ?? {}).pipe(
      catchError((err) => {
        this.errorState.set(err?.error?.message ?? err?.message ?? 'Failed to confirm delivery');
        return of(null);
      })
    );
  }

  // ── Helpers ────────────────────────────────────────────────

  getOrderById(id: string): Order | undefined {
    return this.ordersState().find((o) => o.id === id);
  }

  clearSelectedOrder(): void {
    this.selectedOrderState.set(null);
  }

  clearError(): void {
    this.errorState.set(null);
  }

  // ── Display helpers ────────────────────────────────────────

  getStatusLabel(status: OrderStatus): string {
    const labels: Record<OrderStatus, string> = {
      PENDING: 'Pending',
      CREATED: 'Created',
      PAID: 'Paid',
      APPROVED: 'Approved',
      ASSIGNED_TO_MERCHANT: 'Assigned to Merchant',
      READY_FOR_PICKUP: 'Ready for Pickup',
      PICKED_UP: 'Picked Up',
      OFFLINE_DELIVERY_REQUESTED: 'Delivery Requested',
      FULFILLED: 'Fulfilled',
      DELIVERED: 'Delivered',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      FAILED: 'Failed',
    };
    return labels[status] ?? status;
  }

  getStatusSeverity(status: OrderStatus): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | undefined {
    switch (status) {
      case 'DELIVERED':
      case 'FULFILLED':
      case 'COMPLETED':
        return 'success';
      case 'APPROVED':
      case 'PAID':
        return 'info';
      case 'ASSIGNED_TO_MERCHANT':
      case 'READY_FOR_PICKUP':
      case 'PICKED_UP':
        return 'warn';
      case 'OFFLINE_DELIVERY_REQUESTED':
        return 'contrast';
      case 'CANCELLED':
      case 'FAILED':
        return 'danger';
      case 'PENDING':
      case 'CREATED':
        return 'secondary';
      default:
        return 'secondary';
    }
  }

  getFulfilmentLabel(mode: FulfilmentMode): string {
    return mode === 'PICKUP' ? 'Pickup' : 'Offline Delivery';
  }

  getCustomerTypeLabel(type: CustomerType): string {
    return type === 'MEMBER' ? 'Member' : 'Non-member';
  }

  getUserDisplayName(user: { email: string; username?: string; firstName?: string; lastName?: string } | null | undefined): string {
    if (!user) return 'Guest';
    if (user.firstName || user.lastName) {
      return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    }
    return user.username || user.email;
  }

  /** Return a display name for the order – prefers user, falls back to guest fields */
  getOrderCustomerName(order: Order): string {
    if (order.user) return this.getUserDisplayName(order.user);
    if (order.guestFullName) return order.guestFullName;
    if (order.guestEmail) return order.guestEmail;
    return 'Guest';
  }

  getOrderCustomerEmail(order: Order): string {
    return order.user?.email ?? order.guestEmail ?? '';
  }

  getOrderCustomerUsername(order: Order): string {
    if (order.user) {
      return order.user.username ?? order.user.email.split('@')[0];
    }
    if (order.guestFullName) return order.guestFullName;
    if (order.guestEmail) return order.guestEmail.split('@')[0];
    return 'Guest';
  }
}
