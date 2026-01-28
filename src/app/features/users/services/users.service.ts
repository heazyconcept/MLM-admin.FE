import { Injectable, signal } from '@angular/core';

export type UserStatus = 'Active' | 'Suspended' | 'Flagged';
export type UserPackage = 'Silver' | 'Gold' | 'Platinum' | 'Ruby' | 'Diamond';
export type UserRole = 'User' | 'Merchant';

export interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  package: UserPackage;
  status: UserStatus;
  role: UserRole;
  registrationDate: Date;
  upline?: string;
  downlinesCount: number;
  rank: string;
  wallets: {
    cash: number;
    productVoucher: number;
    autoship: number;
  };
  activityLog: ActivityLogItem[];
}

export interface ActivityLogItem {
  id: string;
  action: string;
  timestamp: Date;
  performedBy: string;
}

export interface UserFilters {
  search: string;
  status: UserStatus | '';
  package: UserPackage | '';
  role: UserRole | '';
  dateFrom: Date | null;
  dateTo: Date | null;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private mockUsers: User[] = [
    {
      id: 'USR-001',
      fullName: 'John Adewale',
      username: 'jadewale',
      email: 'john.adewale@email.com',
      phone: '+234 801 234 5678',
      package: 'Gold',
      status: 'Active',
      role: 'User',
      registrationDate: new Date('2025-06-15'),
      upline: 'USR-000',
      downlinesCount: 45,
      rank: 'Senior Manager',
      wallets: { cash: 125000, productVoucher: 45000, autoship: 12000 },
      activityLog: [
        { id: '1', action: 'Account created', timestamp: new Date('2025-06-15'), performedBy: 'System' },
        { id: '2', action: 'Package upgraded to Gold', timestamp: new Date('2025-08-20'), performedBy: 'Admin' }
      ]
    },
    {
      id: 'USR-002',
      fullName: 'Sarah Okonkwo',
      username: 'sokonkwo',
      email: 'sarah.okonkwo@email.com',
      phone: '+234 802 345 6789',
      package: 'Platinum',
      status: 'Active',
      role: 'Merchant',
      registrationDate: new Date('2025-03-22'),
      upline: 'USR-001',
      downlinesCount: 120,
      rank: 'Director',
      wallets: { cash: 580000, productVoucher: 120000, autoship: 45000 },
      activityLog: [
        { id: '1', action: 'Account created', timestamp: new Date('2025-03-22'), performedBy: 'System' },
        { id: '2', action: 'Approved as Regional Merchant', timestamp: new Date('2025-05-10'), performedBy: 'Admin' }
      ]
    },
    {
      id: 'USR-003',
      fullName: 'Michael Eze',
      username: 'meze',
      email: 'michael.eze@email.com',
      phone: '+234 803 456 7890',
      package: 'Silver',
      status: 'Suspended',
      role: 'User',
      registrationDate: new Date('2025-09-10'),
      upline: 'USR-002',
      downlinesCount: 8,
      rank: 'Mentor',
      wallets: { cash: 15000, productVoucher: 5000, autoship: 2000 },
      activityLog: [
        { id: '1', action: 'Account created', timestamp: new Date('2025-09-10'), performedBy: 'System' },
        { id: '2', action: 'Account suspended - Policy violation', timestamp: new Date('2025-12-01'), performedBy: 'Admin' }
      ]
    },
    {
      id: 'USR-004',
      fullName: 'Amina Yusuf',
      username: 'ayusuf',
      email: 'amina.yusuf@email.com',
      phone: '+234 804 567 8901',
      package: 'Ruby',
      status: 'Active',
      role: 'User',
      registrationDate: new Date('2024-11-05'),
      upline: 'USR-001',
      downlinesCount: 210,
      rank: 'Senior Director',
      wallets: { cash: 1250000, productVoucher: 350000, autoship: 95000 },
      activityLog: [
        { id: '1', action: 'Account created', timestamp: new Date('2024-11-05'), performedBy: 'System' }
      ]
    },
    {
      id: 'USR-005',
      fullName: 'David Chukwu',
      username: 'dchukwu',
      email: 'david.chukwu@email.com',
      phone: '+234 805 678 9012',
      package: 'Diamond',
      status: 'Active',
      role: 'Merchant',
      registrationDate: new Date('2024-05-18'),
      upline: 'USR-000',
      downlinesCount: 450,
      rank: 'Consultant',
      wallets: { cash: 4500000, productVoucher: 890000, autoship: 250000 },
      activityLog: [
        { id: '1', action: 'Account created', timestamp: new Date('2024-05-18'), performedBy: 'System' },
        { id: '2', action: 'Approved as National Merchant', timestamp: new Date('2024-08-15'), performedBy: 'Admin' }
      ]
    },
    {
      id: 'USR-006',
      fullName: 'Grace Emeka',
      username: 'gemeka',
      email: 'grace.emeka@email.com',
      phone: '+234 806 789 0123',
      package: 'Gold',
      status: 'Flagged',
      role: 'User',
      registrationDate: new Date('2025-07-22'),
      upline: 'USR-004',
      downlinesCount: 32,
      rank: 'Manager',
      wallets: { cash: 85000, productVoucher: 28000, autoship: 8500 },
      activityLog: [
        { id: '1', action: 'Account created', timestamp: new Date('2025-07-22'), performedBy: 'System' },
        { id: '2', action: 'Account flagged - Unusual activity', timestamp: new Date('2025-12-15'), performedBy: 'Admin' }
      ]
    },
    {
      id: 'USR-007',
      fullName: 'Peter Nnamdi',
      username: 'pnnamdi',
      email: 'peter.nnamdi@email.com',
      phone: '+234 807 890 1234',
      package: 'Silver',
      status: 'Active',
      role: 'User',
      registrationDate: new Date('2025-11-28'),
      upline: 'USR-002',
      downlinesCount: 3,
      rank: 'Starter',
      wallets: { cash: 8500, productVoucher: 2500, autoship: 1200 },
      activityLog: [
        { id: '1', action: 'Account created', timestamp: new Date('2025-11-28'), performedBy: 'System' }
      ]
    },
    {
      id: 'USR-008',
      fullName: 'Fatima Bello',
      username: 'fbello',
      email: 'fatima.bello@email.com',
      phone: '+234 808 901 2345',
      package: 'Platinum',
      status: 'Active',
      role: 'User',
      registrationDate: new Date('2025-01-14'),
      upline: 'USR-005',
      downlinesCount: 85,
      rank: 'Director',
      wallets: { cash: 420000, productVoucher: 95000, autoship: 35000 },
      activityLog: [
        { id: '1', action: 'Account created', timestamp: new Date('2025-01-14'), performedBy: 'System' }
      ]
    },
    {
      id: 'USR-009',
      fullName: 'Chinedu Obi',
      username: 'cobi',
      email: 'chinedu.obi@email.com',
      phone: '+234 809 012 3456',
      package: 'Gold',
      status: 'Suspended',
      role: 'User',
      registrationDate: new Date('2025-04-08'),
      upline: 'USR-004',
      downlinesCount: 18,
      rank: 'Senior Manager',
      wallets: { cash: 0, productVoucher: 12000, autoship: 5000 },
      activityLog: [
        { id: '1', action: 'Account created', timestamp: new Date('2025-04-08'), performedBy: 'System' },
        { id: '2', action: 'Account suspended - Failed KYC', timestamp: new Date('2025-10-20'), performedBy: 'Admin' }
      ]
    },
    {
      id: 'USR-010',
      fullName: 'Blessing Adeola',
      username: 'badeola',
      email: 'blessing.adeola@email.com',
      phone: '+234 810 123 4567',
      package: 'Ruby',
      status: 'Active',
      role: 'Merchant',
      registrationDate: new Date('2024-08-30'),
      upline: 'USR-005',
      downlinesCount: 165,
      rank: 'Senior Director',
      wallets: { cash: 920000, productVoucher: 280000, autoship: 75000 },
      activityLog: [
        { id: '1', action: 'Account created', timestamp: new Date('2024-08-30'), performedBy: 'System' },
        { id: '2', action: 'Approved as Regional Merchant', timestamp: new Date('2024-11-12'), performedBy: 'Admin' }
      ]
    }
  ];

  users = signal<User[]>(this.mockUsers);
  selectedUser = signal<User | null>(null);

  getUsers(): User[] {
    return this.users();
  }

  getUserById(id: string): User | undefined {
    return this.users().find(user => user.id === id);
  }

  filterUsers(filters: UserFilters): User[] {
    let filtered = [...this.mockUsers];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(user =>
        user.fullName.toLowerCase().includes(search) ||
        user.username.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.id.toLowerCase().includes(search)
      );
    }

    if (filters.status) {
      filtered = filtered.filter(user => user.status === filters.status);
    }

    if (filters.package) {
      filtered = filtered.filter(user => user.package === filters.package);
    }

    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(user => user.registrationDate >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      filtered = filtered.filter(user => user.registrationDate <= filters.dateTo!);
    }

    return filtered;
  }

  updateUserStatus(userId: string, status: UserStatus, reason: string): void {
    const users = this.users();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex > -1) {
      const updatedUsers = [...users];
      updatedUsers[userIndex] = {
        ...updatedUsers[userIndex],
        status,
        activityLog: [
          ...updatedUsers[userIndex].activityLog,
          {
            id: String(Date.now()),
            action: `Status changed to ${status}${reason ? ': ' + reason : ''}`,
            timestamp: new Date(),
            performedBy: 'Admin'
          }
        ]
      };
      this.users.set(updatedUsers);
    }
  }

  addActivityLog(userId: string, action: string): void {
    const users = this.users();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex > -1) {
      const updatedUsers = [...users];
      updatedUsers[userIndex] = {
        ...updatedUsers[userIndex],
        activityLog: [
          ...updatedUsers[userIndex].activityLog,
          {
            id: String(Date.now()),
            action,
            timestamp: new Date(),
            performedBy: 'Admin'
          }
        ]
      };
      this.users.set(updatedUsers);
    }
  }
}

