import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TimelineModule } from 'primeng/timeline';
import { MenuItem } from 'primeng/api';

// App
import { OrderService } from '../../../core/services/order.service';
import { OrderStatus } from '../../../core/models/order.model';

@Component({
  selector: 'app-order-details',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TagModule,
    SplitButtonModule,
    TimelineModule
  ],
  templateUrl: './order-details.component.html',
  styleUrls: ['./order-details.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderDetailsComponent {
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private orderService = inject(OrderService);

  orderId = signal<string>('');
  
  // Order Data
  // Note: In real app, we might trigger a fetch. Here we rely on the service selector.
  // We need to set orderId from route params first.
  
  constructor() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.orderId.set(id);
      }
    });
  }

  // Computed Order
  // Accessing the computed signal from service dynamically based on local orderId
  // Since getOrder returns a computed, we effectively have a computed of a computed
  order = computed(() => {
    const id = this.orderId();
    if (!id) return null;
    return this.orderService.getOrder(id)();
  });

  // Action Menu Items
  statusMenuItems: MenuItem[] = [
    { label: 'Mark as Processing', command: () => this.updateStatus('Processing') },
    { label: 'Mark as Ready', command: () => this.updateStatus('Ready') },
    { label: 'Mark as Completed', command: () => this.updateStatus('Completed') },
    { separator: true },
    { label: 'Mark as Delayed', icon: 'pi pi-exclamation-triangle', command: () => this.updateStatus('Delayed') },
    { label: 'Cancel Order', icon: 'pi pi-times', styleClass: 'text-red-600', command: () => this.updateStatus('Cancelled') },
  ];

  goBack() {
    this.location.back();
  }

  updateStatus(status: OrderStatus) {
    if (this.orderId()) {
      this.orderService.updateOrderStatus(this.orderId(), status);
    }
  }

  flagOrder() {
    const current = this.order();
    if (current) {
      this.orderService.flagOrder(current.id, !current.isFlagged);
    }
  }

  getSubtotal() {
    const order = this.order();
    if (!order) return 0;
    return order.totalAmount - order.logisticsCost;
  }

  getStatusSeverity(status: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | undefined {
    switch (status) {
      case 'Completed': return 'success';
      case 'Ready': return 'info';
      case 'Processing': return 'info';
      case 'Pending': return 'secondary';
      case 'Delayed': return 'warn';
      case 'Failed':
      case 'Cancelled': return 'danger';
      default: return 'secondary';
    }
  }
}
