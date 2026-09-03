import { OrderStatus } from '../models/order.model';

/** Statuses used in production today (backend + admin filters). */
export const ACTIVE_ORDER_STATUSES: readonly OrderStatus[] = [
  'PAID',
  'ASSIGNED_TO_MERCHANT',
  'DELIVERED',
  'FAILED',
  'CANCELLED',
] as const;

export const ACTIVE_ORDER_STATUS_SET = new Set<string>(ACTIVE_ORDER_STATUSES);

export const ORDER_STATUS_FILTER_OPTIONS: { label: string; value: OrderStatus }[] = [
  { label: 'Paid', value: 'PAID' },
  { label: 'Assigned to Merchant', value: 'ASSIGNED_TO_MERCHANT' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];
