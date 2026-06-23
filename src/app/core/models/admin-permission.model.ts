/**
 * Admin permission types aligned with admin-navigation-permission-matrix.md
 *
 * NOTE: AdminRole enum is kept for legacy display only.
 * Permission checks use dynamic RBAC keys from login effectivePermissions via PermissionService.
 */

export enum AdminRole {
  SuperAdmin = 'SuperAdmin',
  FinanceAdmin = 'FinanceAdmin',
  OperationsAdmin = 'OperationsAdmin',
  SupportAdmin = 'SupportAdmin',
  ReadOnlyAdmin = 'ReadOnlyAdmin'
}

export enum Feature {
  Dashboard = 'Dashboard',
  Users = 'Users',
  Earnings = 'Earnings',
  Wallets = 'Wallets',
  Withdrawals = 'Withdrawals',
  Payments = 'Payments',
  Products = 'Products',
  OrdersLogistics = 'OrdersLogistics',
  Merchants = 'Merchants',
  Notifications = 'Notifications',
  ReportsAudit = 'ReportsAudit',
  SystemConfig = 'SystemConfig',
  AdminManagement = 'AdminManagement'
}

export enum Action {
  ApproveWithdrawal = 'ApproveWithdrawal',
  ManualWalletAdjustment = 'ManualWalletAdjustment',
  MarkPaymentSuccessful = 'MarkPaymentSuccessful',
  UpdateOrderStatus = 'UpdateOrderStatus',
  AssignMerchant = 'AssignMerchant',
  ApproveMerchant = 'ApproveMerchant',
  SuspendUser = 'SuspendUser',
  ResetUserPassword = 'ResetUserPassword',
  UpdateEarningsConfig = 'UpdateEarningsConfig',
  ChangeSystemConfig = 'ChangeSystemConfig',
  ToggleFeatures = 'ToggleFeatures'
}

export type AccessLevel = 'full' | 'view' | 'none';
