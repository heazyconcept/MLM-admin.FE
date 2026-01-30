
export type OrderStatus = 'Pending' | 'Processing' | 'Ready' | 'Completed' | 'Cancelled' | 'Delayed' | 'Failed';
export type FulfilmentType = 'Pickup' | 'Delivery';

export interface OrderUser {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface OrderMerchant {
  id: string;
  name: string;
  address?: string; // For Pickup
  phone?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  thumbnail: string;
}

export interface DeliveryDetails {
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  logisticsPartner?: string;
  trackingNumber?: string;
  estimatedDelivery?: Date;
}

export interface LogisticsTimelineEvent {
  status: OrderStatus;
  date: Date;
  note?: string;
  by: string; // User or System
}

export interface Order {
  id: string;
  user: OrderUser;
  merchant?: OrderMerchant; // For Pickup or if source is relevant
  items: OrderItem[];
  totalAmount: number;
  logisticsCost: number;
  fulfilmentType: FulfilmentType;
  deliveryDetails?: DeliveryDetails;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  timeline: LogisticsTimelineEvent[];
  internalNotes?: string;
  isFlagged?: boolean;
}

export interface LogisticsRule {
  id: string;
  name: string;
  type: 'Region' | 'Weight' | 'Flat';
  cost: number;
  condition?: string; // e.g. "Lagos", "> 10kg"
  isActive: boolean;
}
