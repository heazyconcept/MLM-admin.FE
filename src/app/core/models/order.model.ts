// ── API-aligned types ────────────────────────────────────────

export type OrderStatus =
  | 'PENDING'
  | 'CREATED'
  | 'PAID'
  | 'APPROVED'
  | 'ASSIGNED_TO_MERCHANT'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'OFFLINE_DELIVERY_REQUESTED'
  | 'FULFILLED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

export type FulfilmentMode = 'PICKUP' | 'OFFLINE_DELIVERY';

export type CustomerType = 'MEMBER' | 'NON_MEMBER';

export type MerchantRoute = 'CLOSEST' | 'OTHER';

export type OrderDisputeStatus = 'OPEN' | 'RESOLVED' | 'CLOSED';

export type OrderDisputeOutcome = 'MERCHANT' | 'CUSTOMER';

export interface OrderUser {
  id: string;
  email: string;
  username?: string;
  referralCode?: string;
  firstName?: string;
  lastName?: string;
  [key: string]: unknown;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  pv: number;
  directReferralPv: number;
  cpv: number;
  lineTotal: number;
}

export interface OrderPayment {
  id: string;
  status: string;
  [key: string]: unknown;
}

export interface OrderDisputeSummary {
  id: string;
  status: OrderDisputeStatus;
}

export interface Order {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  baseAmount: number;
  currency: string;
  paymentMethod: string;
  fulfilmentMode: FulfilmentMode;
  customerType: CustomerType;
  guestFullName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  guestCity?: string | null;
  guestCountry?: string | null;
  merchantRoute: MerchantRoute | null;
  selectedMerchantId: string | null;
  assignedMerchantId?: string | null;
  deliveryAddress: string | null;
  deliveryDisclaimerAccepted: boolean;
  sentAt: string | null;
  sentBy: string | null;
  receivedAt: string | null;
  checkoutBatchId?: string | null;
  pickedUpAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  cancelledByAdminId?: string | null;
  dispute?: OrderDisputeSummary | null;
  items: OrderItem[];
  createdAt: string;
  user: OrderUser | null;
  payment?: OrderPayment | null;
}

export interface OrderDispute {
  id: string;
  status: OrderDisputeStatus;
  orderId: string;
  merchantId?: string;
  merchantName?: string;
  customerName?: string;
  reason: string;
  customerNotes?: string | null;
  adminNotes?: string | null;
  outcome?: OrderDisputeOutcome | null;
  resolution?: string | null;
  evidenceUrls?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface OrderDisputeFilters {
  status?: OrderDisputeStatus;
  merchantId?: string;
  limit?: number;
  offset?: number;
}

export interface ResolveOrderDisputeBody {
  outcome: OrderDisputeOutcome;
  adminNotes?: string;
  resolution?: string;
}

// ── Query params for GET /admin/orders ────────────────────────

export interface AdminOrderFilters {
  userId?: string;
  status?: OrderStatus;
  fulfilmentMode?: FulfilmentMode;
  selectedMerchantId?: string;
  customerType?: CustomerType;
  merchantRoute?: MerchantRoute;
  productId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
  search?: string;
}

// ── API response for order list ────────────────────────────────

export interface AdminOrdersListResponse {
  orders: Order[];
  total: number;
  limit: number;
  offset: number;
}

// ── Logistics (kept for logistics module) ─────────────────────

export interface LogisticsRule {
  id: string;
  name: string;
  type: 'Region' | 'Weight' | 'Flat';
  cost: number;
  condition?: string;
  isActive: boolean;
}
