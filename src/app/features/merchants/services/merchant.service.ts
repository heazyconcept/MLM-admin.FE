import { Injectable, signal, computed } from '@angular/core';

// Types
export type MerchantStatus = 'Pending' | 'Approved' | 'Suspended';
export type MerchantType = 'Regional' | 'National' | 'Global';

// Interfaces
export interface StatusHistoryEntry {
  date: Date;
  status: MerchantStatus;
  reason?: string;
  changedBy?: string;
}

export interface Merchant {
  id: string;
  businessName: string;
  ownerId: string;
  ownerName: string;
  type: MerchantType;
  region: string[];
  status: MerchantStatus;
  assignedProductIds: string[];
  statusHistory: StatusHistoryEntry[];
  suspendedReason?: string;
  registrationDate: Date;
  email: string;
  phone: string;
}

export interface MerchantPerformance {
  ordersFulfilled: number;
  deliverySuccessRate: number;
  earnings: number;
  customerRating?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MerchantService {
  // Mock regions list
  private readonly regionsList = signal<string[]>([
    'North Region',
    'South Region',
    'East Region',
    'West Region',
    'Central Region',
    'Metropolitan Area',
    'Suburban Zone',
    'Rural Districts'
  ]);

  // Private state
  private readonly merchantsState = signal<Merchant[]>(this.generateMockMerchants());
  private readonly selectedMerchantState = signal<Merchant | null>(null);

  // Public readonly signals
  readonly merchants = this.merchantsState.asReadonly();
  readonly selectedMerchant = this.selectedMerchantState.asReadonly();
  readonly regions = this.regionsList.asReadonly();

  // Computed signals
  readonly pendingCount = computed(() => 
    this.merchantsState().filter((m: Merchant) => m.status === 'Pending').length
  );

  readonly approvedCount = computed(() => 
    this.merchantsState().filter((m: Merchant) => m.status === 'Approved').length
  );

  readonly suspendedCount = computed(() => 
    this.merchantsState().filter((m: Merchant) => m.status === 'Suspended').length
  );

  // Methods
  getMerchantById(id: string): Merchant | undefined {
    const merchant = this.merchantsState().find((m: Merchant) => m.id === id);
    this.selectedMerchantState.set(merchant || null);
    return merchant;
  }

  approveMerchant(id: string): boolean {
    const merchants = this.merchantsState();
    const merchantIndex = merchants.findIndex((m: Merchant) => m.id === id);
    
    if (merchantIndex === -1) return false;
    
    const updatedMerchants = [...merchants];
    const merchant = { ...updatedMerchants[merchantIndex] };
    
    merchant.status = 'Approved';
    merchant.statusHistory = [
      ...merchant.statusHistory,
      {
        date: new Date(),
        status: 'Approved',
        changedBy: 'Admin'
      }
    ];
    
    updatedMerchants[merchantIndex] = merchant;
    this.merchantsState.set(updatedMerchants);
    
    if (this.selectedMerchantState()?.id === id) {
      this.selectedMerchantState.set(merchant);
    }
    
    return true;
  }

  suspendMerchant(id: string, reason: string): boolean {
    const merchants = this.merchantsState();
    const merchantIndex = merchants.findIndex((m: Merchant) => m.id === id);
    
    if (merchantIndex === -1) return false;
    
    const updatedMerchants = [...merchants];
    const merchant = { ...updatedMerchants[merchantIndex] };
    
    merchant.status = 'Suspended';
    merchant.suspendedReason = reason;
    merchant.statusHistory = [
      ...merchant.statusHistory,
      {
        date: new Date(),
        status: 'Suspended',
        reason,
        changedBy: 'Admin'
      }
    ];
    
    updatedMerchants[merchantIndex] = merchant;
    this.merchantsState.set(updatedMerchants);
    
    if (this.selectedMerchantState()?.id === id) {
      this.selectedMerchantState.set(merchant);
    }
    
    return true;
  }

  reactivateMerchant(id: string): boolean {
    const merchants = this.merchantsState();
    const merchantIndex = merchants.findIndex((m: Merchant) => m.id === id);
    
    if (merchantIndex === -1) return false;
    
    const updatedMerchants = [...merchants];
    const merchant = { ...updatedMerchants[merchantIndex] };
    
    merchant.status = 'Approved';
    merchant.suspendedReason = undefined;
    merchant.statusHistory = [
      ...merchant.statusHistory,
      {
        date: new Date(),
        status: 'Approved',
        reason: 'Reactivated',
        changedBy: 'Admin'
      }
    ];
    
    updatedMerchants[merchantIndex] = merchant;
    this.merchantsState.set(updatedMerchants);
    
    if (this.selectedMerchantState()?.id === id) {
      this.selectedMerchantState.set(merchant);
    }
    
    return true;
  }

  updateMerchantType(id: string, type: MerchantType): boolean {
    const merchants = this.merchantsState();
    const merchantIndex = merchants.findIndex((m: Merchant) => m.id === id);
    
    if (merchantIndex === -1) return false;
    
    const updatedMerchants = [...merchants];
    const merchant = { ...updatedMerchants[merchantIndex] };
    const oldType = merchant.type;
    
    merchant.type = type;
    merchant.statusHistory = [
      ...merchant.statusHistory,
      {
        date: new Date(),
        status: merchant.status,
        reason: `Type changed from ${oldType} to ${type}`,
        changedBy: 'Admin'
      }
    ];
    
    updatedMerchants[merchantIndex] = merchant;
    this.merchantsState.set(updatedMerchants);
    
    if (this.selectedMerchantState()?.id === id) {
      this.selectedMerchantState.set(merchant);
    }
    
    return true;
  }

  assignRegions(id: string, regions: string[]): boolean {
    const merchants = this.merchantsState();
    const merchantIndex = merchants.findIndex((m: Merchant) => m.id === id);
    
    if (merchantIndex === -1) return false;
    
    const updatedMerchants = [...merchants];
    const merchant = { ...updatedMerchants[merchantIndex] };
    
    merchant.region = regions;
    merchant.statusHistory = [
      ...merchant.statusHistory,
      {
        date: new Date(),
        status: merchant.status,
        reason: `Regions updated to: ${regions.join(', ')}`,
        changedBy: 'Admin'
      }
    ];
    
    updatedMerchants[merchantIndex] = merchant;
    this.merchantsState.set(updatedMerchants);
    
    if (this.selectedMerchantState()?.id === id) {
      this.selectedMerchantState.set(merchant);
    }
    
    return true;
  }

  getPerformance(id: string): MerchantPerformance {
    // Mock performance data - in real app, this would be fetched from API
    const mockPerformances: Record<string, MerchantPerformance> = {
      'MERCH-001': {
        ordersFulfilled: 342,
        deliverySuccessRate: 98.5,
        earnings: 125430.50,
        customerRating: 4.8
      },
      'MERCH-002': {
        ordersFulfilled: 567,
        deliverySuccessRate: 97.2,
        earnings: 234560.75,
        customerRating: 4.9
      },
      'MERCH-003': {
        ordersFulfilled: 189,
        deliverySuccessRate: 95.3,
        earnings: 78920.30,
        customerRating: 4.6
      },
      'MERCH-005': {
        ordersFulfilled: 423,
        deliverySuccessRate: 96.8,
        earnings: 167890.20,
        customerRating: 4.7
      },
      'MERCH-007': {
        ordersFulfilled: 298,
        deliverySuccessRate: 94.5,
        earnings: 102340.60,
        customerRating: 4.5
      }
    };

    return mockPerformances[id] || {
      ordersFulfilled: 0,
      deliverySuccessRate: 0,
      earnings: 0
    };
  }

  // Generate mock merchants
  private generateMockMerchants(): Merchant[] {
    return [
      {
        id: 'MERCH-001',
        businessName: 'GlobalTrade Solutions',
        ownerId: 'USR-10234',
        ownerName: 'John Anderson',
        type: 'Global',
        region: ['North Region', 'South Region', 'East Region'],
        status: 'Approved',
        assignedProductIds: ['PROD-101', 'PROD-102', 'PROD-103', 'PROD-104'],
        registrationDate: new Date('2025-08-15'),
        email: 'john.anderson@globaltrade.com',
        phone: '+1-555-0101',
        statusHistory: [
          {
            date: new Date('2025-08-15'),
            status: 'Pending',
            changedBy: 'System'
          },
          {
            date: new Date('2025-08-18'),
            status: 'Approved',
            changedBy: 'Admin'
          }
        ]
      },
      {
        id: 'MERCH-002',
        businessName: 'Metro Distributors Inc',
        ownerId: 'USR-10567',
        ownerName: 'Sarah Chen',
        type: 'National',
        region: ['Metropolitan Area', 'Suburban Zone'],
        status: 'Approved',
        assignedProductIds: ['PROD-201', 'PROD-202', 'PROD-203', 'PROD-204', 'PROD-205'],
        registrationDate: new Date('2025-09-02'),
        email: 'sarah.chen@metrodist.com',
        phone: '+1-555-0102',
        statusHistory: [
          {
            date: new Date('2025-09-02'),
            status: 'Pending',
            changedBy: 'System'
          },
          {
            date: new Date('2025-09-05'),
            status: 'Approved',
            changedBy: 'Admin'
          }
        ]
      },
      {
        id: 'MERCH-003',
        businessName: 'Regional Wholesale Co',
        ownerId: 'USR-10892',
        ownerName: 'Michael Brown',
        type: 'Regional',
        region: ['West Region'],
        status: 'Suspended',
        suspendedReason: 'Multiple delivery failures and customer complaints',
        assignedProductIds: ['PROD-301', 'PROD-302'],
        registrationDate: new Date('2025-07-20'),
        email: 'michael.brown@regionalwholesale.com',
        phone: '+1-555-0103',
        statusHistory: [
          {
            date: new Date('2025-07-20'),
            status: 'Pending',
            changedBy: 'System'
          },
          {
            date: new Date('2025-07-23'),
            status: 'Approved',
            changedBy: 'Admin'
          },
          {
            date: new Date('2026-01-15'),
            status: 'Suspended',
            reason: 'Multiple delivery failures and customer complaints',
            changedBy: 'Admin'
          }
        ]
      },
      {
        id: 'MERCH-004',
        businessName: 'Northern Commerce Hub',
        ownerId: 'USR-11234',
        ownerName: 'Emily Davis',
        type: 'Regional',
        region: ['North Region'],
        status: 'Pending',
        assignedProductIds: [],
        registrationDate: new Date('2026-01-20'),
        email: 'emily.davis@northernhub.com',
        phone: '+1-555-0104',
        statusHistory: [
          {
            date: new Date('2026-01-20'),
            status: 'Pending',
            changedBy: 'System'
          }
        ]
      },
      {
        id: 'MERCH-005',
        businessName: 'Central Logistics Partners',
        ownerId: 'USR-11567',
        ownerName: 'David Wilson',
        type: 'National',
        region: ['Central Region', 'East Region', 'West Region'],
        status: 'Approved',
        assignedProductIds: ['PROD-401', 'PROD-402', 'PROD-403'],
        registrationDate: new Date('2025-10-10'),
        email: 'david.wilson@centrallogistics.com',
        phone: '+1-555-0105',
        statusHistory: [
          {
            date: new Date('2025-10-10'),
            status: 'Pending',
            changedBy: 'System'
          },
          {
            date: new Date('2025-10-12'),
            status: 'Approved',
            changedBy: 'Admin'
          }
        ]
      },
      {
        id: 'MERCH-006',
        businessName: 'Southern Supply Network',
        ownerId: 'USR-11890',
        ownerName: 'Jessica Martinez',
        type: 'Regional',
        region: ['South Region'],
        status: 'Pending',
        assignedProductIds: [],
        registrationDate: new Date('2026-01-25'),
        email: 'jessica.martinez@southernsupply.com',
        phone: '+1-555-0106',
        statusHistory: [
          {
            date: new Date('2026-01-25'),
            status: 'Pending',
            changedBy: 'System'
          }
        ]
      },
      {
        id: 'MERCH-007',
        businessName: 'Rural Distribution Services',
        ownerId: 'USR-12123',
        ownerName: 'Robert Taylor',
        type: 'Regional',
        region: ['Rural Districts'],
        status: 'Approved',
        assignedProductIds: ['PROD-501', 'PROD-502'],
        registrationDate: new Date('2025-11-05'),
        email: 'robert.taylor@ruraldist.com',
        phone: '+1-555-0107',
        statusHistory: [
          {
            date: new Date('2025-11-05'),
            status: 'Pending',
            changedBy: 'System'
          },
          {
            date: new Date('2025-11-08'),
            status: 'Approved',
            changedBy: 'Admin'
          }
        ]
      },
      {
        id: 'MERCH-008',
        businessName: 'Express Delivery Systems',
        ownerId: 'USR-12456',
        ownerName: 'Amanda White',
        type: 'National',
        region: ['Metropolitan Area', 'Suburban Zone', 'Central Region'],
        status: 'Pending',
        assignedProductIds: [],
        registrationDate: new Date('2026-01-28'),
        email: 'amanda.white@expressdelivery.com',
        phone: '+1-555-0108',
        statusHistory: [
          {
            date: new Date('2026-01-28'),
            status: 'Pending',
            changedBy: 'System'
          }
        ]
      },
      {
        id: 'MERCH-009',
        businessName: 'Premium Wholesale Group',
        ownerId: 'USR-12789',
        ownerName: 'Christopher Lee',
        type: 'Global',
        region: ['North Region', 'South Region', 'East Region', 'West Region', 'Central Region'],
        status: 'Approved',
        assignedProductIds: ['PROD-601', 'PROD-602', 'PROD-603', 'PROD-604', 'PROD-605', 'PROD-606'],
        registrationDate: new Date('2025-06-12'),
        email: 'christopher.lee@premiumwholesale.com',
        phone: '+1-555-0109',
        statusHistory: [
          {
            date: new Date('2025-06-12'),
            status: 'Pending',
            changedBy: 'System'
          },
          {
            date: new Date('2025-06-15'),
            status: 'Approved',
            changedBy: 'Admin'
          }
        ]
      },
      {
        id: 'MERCH-010',
        businessName: 'Suburban Commerce Solutions',
        ownerId: 'USR-13012',
        ownerName: 'Michelle Garcia',
        type: 'Regional',
        region: ['Suburban Zone'],
        status: 'Suspended',
        suspendedReason: 'Documentation verification failed',
        assignedProductIds: ['PROD-701'],
        registrationDate: new Date('2025-12-01'),
        email: 'michelle.garcia@suburbancommerce.com',
        phone: '+1-555-0110',
        statusHistory: [
          {
            date: new Date('2025-12-01'),
            status: 'Pending',
            changedBy: 'System'
          },
          {
            date: new Date('2025-12-05'),
            status: 'Approved',
            changedBy: 'Admin'
          },
          {
            date: new Date('2026-01-10'),
            status: 'Suspended',
            reason: 'Documentation verification failed',
            changedBy: 'Admin'
          }
        ]
      }
    ];
  }
}
