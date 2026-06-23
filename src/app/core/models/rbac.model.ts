/**
 * Role-Based Access Control (RBAC) Models
 * Dynamic permission system replacing hardcoded AdminRole/FEATURE_ACCESS_MATRIX
 */

// ────────────────────────────────────────────
// Permission
// ────────────────────────────────────────────

export type PermissionType = 'view' | 'action';

/** A single atomic permission (seeded by backend, ~54 total) */
export interface Permission {
  id: string;
  key: string;           // e.g. 'users.suspend', 'wallets.adjust_funds'
  label: string;         // e.g. 'Suspend User'
  description?: string;
  module: string;        // e.g. 'Users', 'Wallets'
  type: PermissionType;  // 'view' or 'action'
}

/** Permissions grouped by module (for the role builder UI) */
export interface PermissionGroup {
  module: string;
  permissions: Permission[];
}

// ────────────────────────────────────────────
// Role
// ────────────────────────────────────────────

/** A named bundle of permissions */
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystemRole: boolean;  // system roles (e.g. SuperAdmin) cannot be deleted
  userCount: number;      // number of admin users using this role (via groups)
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleRequest {
  name: string;
  description: string;
  permissionIds: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissionIds?: string[];
}

// ────────────────────────────────────────────
// User Group
// ────────────────────────────────────────────

/** A named bundle of roles; admin users are assigned to groups */
export interface UserGroup {
  id: string;
  name: string;
  description: string;
  roles: Role[];
  memberCount: number;
  isSystemGroup: boolean; // system groups (SuperAdmin) cannot be deleted
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserGroupRequest {
  name: string;
  description: string;
  roleIds: string[];
}

export interface UpdateUserGroupRequest {
  name?: string;
  description?: string;
  roleIds?: string[];
}

// ────────────────────────────────────────────
// Admin User
// ────────────────────────────────────────────

/** An admin panel user (not a platform user) */
export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  username: string;
  isActive: boolean;
  mustChangePassword: boolean;
  groups: UserGroup[];
  effectivePermissions: string[];  // flattened list of permission keys
  createdAt: string;
  lastLogin: string | null;
}

export interface CreateAdminUserRequest {
  fullName: string;
  email: string;
  username: string;
  temporaryPassword: string;
  groupIds: string[];
}

export interface UpdateAdminUserRequest {
  fullName?: string;
  email?: string;
  groupIds?: string[];
}

export interface AdminUserStatusRequest {
  isActive: boolean;
}

export interface ResetAdminPasswordRequest {
  temporaryPassword: string;
}

// ────────────────────────────────────────────
// API Responses
// ────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminMePermissions {
  userId: string;
  username: string;
  groups: string[];
  permissions: string[];
}

// ────────────────────────────────────────────
// Permission Key Constants
// ────────────────────────────────────────────

/** All permission modules — used for grouping in the UI */
export const PERMISSION_MODULES = [
  'Dashboard',
  'Users',
  'Earnings',
  'Wallets',
  'Withdrawals',
  'Payments',
  'Products',
  'Orders',
  'Merchants',
  'Notifications',
  'Reports',
  'Audit',
  'System',
  'Admin Management',
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];

/**
 * Maps Feature enum values to permission key prefixes.
 * Used by PermissionService to bridge the route guard system
 * with the dynamic RBAC permission keys.
 */
export const FEATURE_TO_PERMISSION_PREFIX: Record<string, string> = {
  'Dashboard': 'dashboard.',
  'Users': 'users.',
  'Earnings': 'earnings.',
  'Wallets': 'wallets.',
  'Withdrawals': 'withdrawals.',
  'Payments': 'payments.',
  'Products': 'products.',
  'OrdersLogistics': 'orders.',
  'Merchants': 'merchants.',
  'Notifications': 'notifications.',
  'ReportsAudit': 'reports.,audit.',
  'SystemConfig': 'system.',
  'AdminManagement': 'admin_management.',
};

/**
 * Full list of permission keys (for reference & frontend fallback).
 * The backend seeds these; this list is used for the role builder UI
 * if the API is not yet available.
 */
export const ALL_PERMISSION_KEYS: Permission[] = [
  // Dashboard
  { id: 'p-01', key: 'dashboard.view', label: 'View Dashboard', module: 'Dashboard', type: 'view' },

  // Users
  { id: 'p-02', key: 'users.view', label: 'View User List', module: 'Users', type: 'view' },
  { id: 'p-03', key: 'users.view_details', label: 'View User Details', module: 'Users', type: 'view' },
  { id: 'p-04', key: 'users.activate_registration', label: 'Activate Registration', module: 'Users', type: 'action' },
  { id: 'p-05', key: 'users.upgrade_package', label: 'Upgrade Package', module: 'Users', type: 'action' },
  { id: 'p-06', key: 'users.fund_cash', label: 'Fund CASH Wallet', module: 'Users', type: 'action' },
  { id: 'p-07', key: 'users.credit_volume', label: 'Credit Volume', module: 'Users', type: 'action' },
  { id: 'p-08', key: 'users.lock_wallet', label: 'Lock/Unlock Wallet', module: 'Users', type: 'action' },
  { id: 'p-09', key: 'users.suspend', label: 'Suspend/Reactivate User', module: 'Users', type: 'action' },
  { id: 'p-10', key: 'users.reset_password', label: 'Reset User Password', module: 'Users', type: 'action' },
  { id: 'p-11', key: 'users.wallet_adjust', label: 'Manual Wallet Adjustment', module: 'Users', type: 'action' },
  { id: 'p-12', key: 'users.impersonate', label: 'Impersonate User', module: 'Users', type: 'action' },

  // Earnings
  { id: 'p-13', key: 'earnings.view', label: 'View Earnings Overview', module: 'Earnings', type: 'view' },
  { id: 'p-14', key: 'earnings.configure_packages', label: 'Configure Packages', module: 'Earnings', type: 'action' },
  { id: 'p-15', key: 'earnings.configure_bonuses', label: 'Configure Bonuses', module: 'Earnings', type: 'action' },
  { id: 'p-16', key: 'earnings.configure_ranking', label: 'Configure Ranking', module: 'Earnings', type: 'action' },
  { id: 'p-17', key: 'earnings.configure_cpv', label: 'Configure CPV Milestones', module: 'Earnings', type: 'action' },

  // Wallets
  { id: 'p-18', key: 'wallets.view', label: 'View Wallet List', module: 'Wallets', type: 'view' },
  { id: 'p-19', key: 'wallets.view_details', label: 'View Wallet Details', module: 'Wallets', type: 'view' },
  { id: 'p-20', key: 'wallets.adjust_funds', label: 'Adjust Wallet Funds', module: 'Wallets', type: 'action' },

  // Withdrawals
  { id: 'p-21', key: 'withdrawals.view', label: 'View Withdrawals', module: 'Withdrawals', type: 'view' },
  { id: 'p-22', key: 'withdrawals.approve', label: 'Approve/Reject Withdrawal', module: 'Withdrawals', type: 'action' },
  { id: 'p-23', key: 'withdrawals.process', label: 'Process Withdrawal', module: 'Withdrawals', type: 'action' },

  // Payments
  { id: 'p-24', key: 'payments.view', label: 'View Payments', module: 'Payments', type: 'view' },
  { id: 'p-25', key: 'payments.view_details', label: 'View Payment Details', module: 'Payments', type: 'view' },
  { id: 'p-26', key: 'payments.mark_successful', label: 'Mark Payment Successful', module: 'Payments', type: 'action' },

  // Products
  { id: 'p-27', key: 'products.view', label: 'View Product Catalog', module: 'Products', type: 'view' },
  { id: 'p-28', key: 'products.create', label: 'Create Product', module: 'Products', type: 'action' },
  { id: 'p-29', key: 'products.edit', label: 'Edit Product', module: 'Products', type: 'action' },
  { id: 'p-30', key: 'products.manage_stock', label: 'Manage Stock', module: 'Products', type: 'action' },
  { id: 'p-31', key: 'products.manage_categories', label: 'Manage Categories', module: 'Products', type: 'action' },

  // Orders
  { id: 'p-32', key: 'orders.view', label: 'View Orders', module: 'Orders', type: 'view' },
  { id: 'p-33', key: 'orders.view_details', label: 'View Order Details', module: 'Orders', type: 'view' },
  { id: 'p-34', key: 'orders.update_status', label: 'Update Order Status', module: 'Orders', type: 'action' },
  { id: 'p-35', key: 'orders.configure_logistics', label: 'Configure Logistics', module: 'Orders', type: 'action' },

  // Merchants
  { id: 'p-36', key: 'merchants.view', label: 'View Merchants', module: 'Merchants', type: 'view' },
  { id: 'p-37', key: 'merchants.view_details', label: 'View Merchant Details', module: 'Merchants', type: 'view' },
  { id: 'p-38', key: 'merchants.approve', label: 'Approve Merchant', module: 'Merchants', type: 'action' },
  { id: 'p-39', key: 'merchants.assign', label: 'Assign Merchant', module: 'Merchants', type: 'action' },
  { id: 'p-40', key: 'merchants.configure_categories', label: 'Configure Categories', module: 'Merchants', type: 'action' },

  // Notifications
  { id: 'p-41', key: 'notifications.view', label: 'View Announcements', module: 'Notifications', type: 'view' },
  { id: 'p-42', key: 'notifications.create', label: 'Create Announcement', module: 'Notifications', type: 'action' },
  { id: 'p-43', key: 'notifications.broadcast', label: 'Broadcast Notification', module: 'Notifications', type: 'action' },

  // Reports
  { id: 'p-44', key: 'reports.view', label: 'View Reports Overview', module: 'Reports', type: 'view' },
  { id: 'p-45', key: 'reports.profit', label: 'View Profit Reports', module: 'Reports', type: 'view' },
  { id: 'p-46', key: 'reports.earnings_payouts', label: 'View Earnings Payouts', module: 'Reports', type: 'view' },
  { id: 'p-47', key: 'reports.cpv', label: 'View CPV Reports', module: 'Reports', type: 'view' },
  { id: 'p-48', key: 'reports.export', label: 'Export Reports', module: 'Reports', type: 'action' },

  // Audit
  { id: 'p-49', key: 'audit.view_logs', label: 'View Audit Logs', module: 'Audit', type: 'view' },

  // System Configuration
  { id: 'p-50', key: 'system.view', label: 'View System Settings', module: 'System', type: 'view' },
  { id: 'p-51', key: 'system.edit_general', label: 'Edit General Settings', module: 'System', type: 'action' },
  { id: 'p-52', key: 'system.edit_financial', label: 'Edit Financial Rules', module: 'System', type: 'action' },
  { id: 'p-53', key: 'system.edit_currency', label: 'Edit Currency Settings', module: 'System', type: 'action' },
  { id: 'p-54', key: 'system.toggle_features', label: 'Toggle Features', module: 'System', type: 'action' },
  { id: 'p-55', key: 'system.edit_thresholds', label: 'Edit Thresholds', module: 'System', type: 'action' },
  { id: 'p-56', key: 'system.edit_api', label: 'Edit API Settings', module: 'System', type: 'action' },

  // Admin Management
  { id: 'p-57', key: 'admin_management.view', label: 'View Admin Management', module: 'Admin Management', type: 'view' },
  { id: 'p-58', key: 'admin_management.manage_roles', label: 'Manage Roles', module: 'Admin Management', type: 'action' },
  { id: 'p-59', key: 'admin_management.manage_groups', label: 'Manage User Groups', module: 'Admin Management', type: 'action' },
  { id: 'p-60', key: 'admin_management.manage_users', label: 'Manage Admin Users', module: 'Admin Management', type: 'action' },
];
