import { Injectable, signal, computed } from '@angular/core';

export type PaymentStatus = 'Pending' | 'Successful' | 'Failed' | 'Reversed';
export type PaymentPurpose = 'Registration' | 'Funding' | 'Upgrade';

export interface PaymentStatusHistory {
  status: PaymentStatus;
  timestamp: Date;
  admin: string;
  reason?: string;
}

export interface Payment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  purpose: PaymentPurpose;
  amount: number;
  currency: string;
  method: string;
  status: PaymentStatus;
  date: Date;
  notes?: string;
  proofUrl?: string; // For manual payments
  statusHistory: PaymentStatusHistory[];
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private paymentsSignal = signal<Payment[]>(this.generateMockPayments());

  readonly payments = computed(() => this.paymentsSignal());

  private generateMockPayments(): Payment[] {
    const statuses: PaymentStatus[] = ['Pending', 'Successful', 'Failed', 'Reversed'];
    const purposes: PaymentPurpose[] = ['Registration', 'Funding', 'Upgrade'];
    const methods = ['Stripe', 'Bank Transfer', 'USDT (TRC20)', 'PayPal', 'Flutterwave'];
    
    const mockPayments: Payment[] = [];
    const now = new Date();

    for (let i = 1; i <= 25; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const purpose = purposes[Math.floor(Math.random() * purposes.length)];
      const method = methods[Math.floor(Math.random() * methods.length)];
      const amount = Math.floor(Math.random() * 5000) + 50;
      const date = new Date(now.getTime() - Math.random() * 10 * 24 * 60 * 60 * 1000);

      const payment: Payment = {
        id: `PAY-${1000 + i}`,
        userId: `USR-${200 + i}`,
        userName: `User ${i}`,
        userEmail: `user${i}@example.com`,
        purpose,
        amount,
        currency: 'USD',
        method,
        status,
        date,
        notes: i % 5 === 0 ? 'Transaction requires manual review' : undefined,
        proofUrl: method === 'Bank Transfer' ? 'https://example.com/proof.jpg' : undefined,
        statusHistory: [
          {
            status: 'Pending',
            timestamp: new Date(date.getTime() - 1000 * 60 * 30),
            admin: 'System'
          }
        ]
      };

      if (status !== 'Pending') {
        payment.statusHistory.push({
          status,
          timestamp: new Date(date.getTime() + 1000 * 60 * 60 * 2),
          admin: 'Admin Sarah',
          reason: status === 'Failed' || status === 'Reversed' ? 'Verification failed' : undefined
        });
      }

      mockPayments.push(payment);
    }

    return mockPayments.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  getPaymentById(id: string | null) {
    if (!id) return null;
    return this.payments().find(p => p.id === id);
  }

  updateStatus(id: string, status: PaymentStatus, admin: string, reason?: string) {
    this.paymentsSignal.update(payments => {
      return payments.map(p => {
        if (p.id === id) {
          const historyEntry: PaymentStatusHistory = {
            status,
            timestamp: new Date(),
            admin,
            reason
          };
          return {
            ...p,
            status,
            statusHistory: [...p.statusHistory, historyEntry]
          };
        }
        return p;
      });
    });
  }

  flagPayment(id: string, reason: string, admin: string) {
    // In this mock, we just add it to history as a "Flagged" event but keep status
    // or maybe we add a 'Flagged' property to Payment interface
    this.paymentsSignal.update(payments => {
      return payments.map(p => {
        if (p.id === id) {
          return {
            ...p,
            notes: p.notes ? `${p.notes} | FLAG: ${reason}` : `FLAG: ${reason}`,
            statusHistory: [...p.statusHistory, {
              status: p.status, // keep current status
              timestamp: new Date(),
              admin,
              reason: `FLAGGED: ${reason}`
            }]
          };
        }
        return p;
      });
    });
  }
}
