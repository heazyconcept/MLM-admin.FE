// ── API-aligned types ────────────────────────────────────────

export type OrderStatus =
  | 'PENDING'
  | 'CREATED'
  | 'PAID'
  | 'APPROVED'
  | 'ASSIGNED_TO_MERCHANT'
  | 'READY_FOR_PICKUP'
  | 'OFFLINE_DELIVERY_REQUESTED'
  | 'FULFILLED'
  | 'DELIVERED';

export type FulfilmentMode = 'PICKUP' | 'OFFLINE_DELIVERY';

export type CustomerType = 'MEMBER' | 'NON_MEMBER';

export type MerchantRoute = 'CLOSEST' | 'OTHER';

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
  items: OrderItem[];
  createdAt: string;
  user: OrderUser | null;
  payment?: OrderPayment | null;
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
