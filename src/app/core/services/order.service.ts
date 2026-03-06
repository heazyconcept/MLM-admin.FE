import { Injectable, signal, computed } from '@angular/core';
import { LogisticsRule } from '../models/order.model';

/**
 * Legacy service – now only manages Logistics Rules.
 * Order CRUD has moved to AdminOrdersService (features/orders/services).
 */
@Injectable({
  providedIn: 'root'
})
export class OrderService {

  // Logistics Rules (mock data – to be replaced with API later)
  private logisticsRulesState = signal<LogisticsRule[]>([
    { id: 'rule_1', name: 'Lagos Island Flat Rate', type: 'Region', cost: 1500, condition: 'Lagos Island', isActive: true },
    { id: 'rule_2', name: 'Lagos Mainland Flat Rate', type: 'Region', cost: 1000, condition: 'Lagos Mainland', isActive: true },
    { id: 'rule_3', name: 'Nationwide Base', type: 'Flat', cost: 3500, condition: 'Other States', isActive: true },
    { id: 'rule_4', name: 'Heavy Item Surcharge', type: 'Weight', cost: 1000, condition: '> 10kg', isActive: true },
  ]);

  logisticsRules = computed(() => this.logisticsRulesState());

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
