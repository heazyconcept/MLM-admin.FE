import { Injectable, signal, computed } from '@angular/core';
import { Order, OrderStatus, LogisticsRule, LogisticsTimelineEvent } from '../models/order.model';

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  // Mock Logistics Rules
  private logisticsRulesState = signal<LogisticsRule[]>([
    { id: 'rule_1', name: 'Lagos Island Flat Rate', type: 'Region', cost: 1500, condition: 'Lagos Island', isActive: true },
    { id: 'rule_2', name: 'Lagos Mainland Flat Rate', type: 'Region', cost: 1000, condition: 'Lagos Mainland', isActive: true },
    { id: 'rule_3', name: 'Nationwide Base', type: 'Flat', cost: 3500, condition: 'Other States', isActive: true },
    { id: 'rule_4', name: 'Heavy Item Surcharge', type: 'Weight', cost: 1000, condition: '> 10kg', isActive: true },
  ]);

  // Mock Orders
  private ordersState = signal<Order[]>([
    {
      id: 'ORD-2024-001',
      user: { id: 'u1', name: 'John Doe', email: 'john@example.com', phone: '+234 800 000 0000' },
      merchant: { id: 'm1', name: 'Lagos Central Hub', address: '123 Market St, Lagos' },
      items: [
        { id: 'i1', name: 'Vitamin C', sku: 'VIT-C', price: 5000, quantity: 2, thumbnail: '' },
        { id: 'i2', name: 'Aloe Gel', sku: 'ALOE', price: 3000, quantity: 1, thumbnail: '' }
      ],
      totalAmount: 13000, // 10000 + 3000
      logisticsCost: 0,
      fulfilmentType: 'Pickup',
      status: 'Pending',
      createdAt: new Date(2024, 0, 15, 10, 30),
      updatedAt: new Date(2024, 0, 15, 10, 30),
      timeline: [
        { status: 'Pending', date: new Date(2024, 0, 15, 10, 30), by: 'System', note: 'Order placed' }
      ]
    },
    {
      id: 'ORD-2024-002',
      user: { id: 'u2', name: 'Jane Smith', email: 'jane@example.com', phone: '+234 800 111 2222' },
      items: [
        { id: 'i3', name: 'Green Tea', sku: 'TEA-GRN', price: 4500, quantity: 3, thumbnail: '' }
      ],
      totalAmount: 15000, // 13500 + 1500 shipping
      logisticsCost: 1500,
      fulfilmentType: 'Delivery',
      deliveryDetails: {
        address: '45 Mainland Way',
        city: 'Ikeja',
        state: 'Lagos',
        logisticsPartner: 'GIG Logistics',
        trackingNumber: 'GIG-123456789'
      },
      status: 'Processing',
      createdAt: new Date(2024, 0, 14, 14, 0),
      updatedAt: new Date(2024, 0, 14, 16, 0),
      timeline: [
        { status: 'Pending', date: new Date(2024, 0, 14, 14, 0), by: 'System', note: 'Order placed' },
        { status: 'Processing', date: new Date(2024, 0, 14, 16, 0), by: 'Admin User', note: 'Confirmed payment' }
      ]
    },
    {
      id: 'ORD-2024-003',
      user: { id: 'u3', name: 'Alice Johnson', email: 'alice@example.com', phone: '+234 700 333 4444' },
      items: [
        { id: 'i4', name: 'Eco Cleaner', sku: 'CLN-ECO', price: 2000, quantity: 5, thumbnail: '' }
      ],
      totalAmount: 13500, // 10000 + 3500 shipping
      logisticsCost: 3500,
      fulfilmentType: 'Delivery',
      deliveryDetails: {
        address: '10 Abuja Crescent',
        city: 'Abuja',
        state: 'FCT'
      },
      status: 'Delayed',
      isFlagged: true,
      internalNotes: 'Customer compliant about wrong address, verifying...',
      createdAt: new Date(2024, 0, 10, 9, 0),
      updatedAt: new Date(2024, 0, 12, 11, 0),
      timeline: [
        { status: 'Pending', date: new Date(2024, 0, 10, 9, 0), by: 'System', note: 'Order placed' },
        { status: 'Processing', date: new Date(2024, 0, 10, 11, 0), by: 'System', note: 'Payment verified' },
        { status: 'Delayed', date: new Date(2024, 0, 12, 11, 0), by: 'Admin User', note: 'Flagged for address verification' }
      ]
    },
    {
      id: 'ORD-2024-004',
      user: { id: 'u4', name: 'Bob Brown', email: 'bob@example.com', phone: '+234 900 555 6666' },
      merchant: { id: 'm1', name: 'Lagos Central Hub', address: '123 Market St, Lagos' },
      items: [
        { id: 'i1', name: 'Vitamin C', sku: 'VIT-C', price: 5000, quantity: 1, thumbnail: '' }
      ],
      totalAmount: 5000,
      logisticsCost: 0,
      fulfilmentType: 'Pickup',
      status: 'Ready',
      createdAt: new Date(2024, 0, 16, 8, 30),
      updatedAt: new Date(2024, 0, 16, 12, 0),
      timeline: [
        { status: 'Pending', date: new Date(2024, 0, 16, 8, 30), by: 'System', note: 'Order placed' },
        { status: 'Processing', date: new Date(2024, 0, 16, 9, 0), by: 'System', note: 'Stock reserved' },
        { status: 'Ready', date: new Date(2024, 0, 16, 12, 0), by: 'Merchant', note: 'Ready for pickup' }
      ]
    }
  ]);

  // Selectors
  orders = computed(() => this.ordersState());
  logisticsRules = computed(() => this.logisticsRulesState());

  getOrder(id: string) {
    return computed(() => this.ordersState().find(o => o.id === id));
  }

  // Actions
  updateOrderStatus(id: string, status: OrderStatus, note?: string) {
    this.ordersState.update(current => 
      current.map(order => {
        if (order.id === id) {
          const newEvent: LogisticsTimelineEvent = {
            status,
            date: new Date(),
            by: 'Admin User', // In real app, get from Auth
            note: note || `Status updated to ${status}`
          };
          return {
            ...order,
            status,
            updatedAt: new Date(),
            timeline: [newEvent, ...order.timeline] // Prepend new event
          };
        }
        return order;
      })
    );
  }

  flagOrder(id: string, isFlagged: boolean, note?: string) {
    this.ordersState.update(current =>
      current.map(order => 
        order.id === id ? { ...order, isFlagged, internalNotes: note ? note : order.internalNotes } : order
      )
    );
  }

  addLogisticsRule(rule: Partial<LogisticsRule>) {
    const newRule: LogisticsRule = {
      id: `rule_${Date.now()}`,
      name: '',
      type: 'Flat',
      cost: 0,
      isActive: true,
      ...rule
    };
    this.logisticsRulesState.update(current => [...current, newRule]);
  }

  toggleRuleStatus(id: string) {
    this.logisticsRulesState.update(current =>
      current.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r)
    );
  }
}
