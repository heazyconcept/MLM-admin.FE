/**
 * Permission matrix from admin-navigation-permission-matrix.md
 * Maps AdminRole x Feature to AccessLevel and AdminRole x Action to boolean
 */

import { AdminRole, Feature, Action, AccessLevel } from '../models/admin-permission.model';

/** Role-based feature access: full | view | none */
export const FEATURE_ACCESS_MATRIX: Record<AdminRole, Record<Feature, AccessLevel>> = {
  [AdminRole.SuperAdmin]: {
    [Feature.Dashboard]: 'full',
    [Feature.Users]: 'full',
    [Feature.Earnings]: 'full',
    [Feature.Wallets]: 'full',
    [Feature.Withdrawals]: 'full',
    [Feature.Payments]: 'full',
    [Feature.Products]: 'full',
    [Feature.OrdersLogistics]: 'full',
    [Feature.Merchants]: 'full',
    [Feature.Notifications]: 'full',
    [Feature.ReportsAudit]: 'full',
    [Feature.SystemConfig]: 'full'
  },
  [AdminRole.FinanceAdmin]: {
    [Feature.Dashboard]: 'full',
    [Feature.Users]: 'none',
    [Feature.Earnings]: 'view',
    [Feature.Wallets]: 'full',
    [Feature.Withdrawals]: 'full',
    [Feature.Payments]: 'full',
    [Feature.Products]: 'none',
    [Feature.OrdersLogistics]: 'none',
    [Feature.Merchants]: 'none',
    [Feature.Notifications]: 'none',
    [Feature.ReportsAudit]: 'view',
    [Feature.SystemConfig]: 'none'
  },
  [AdminRole.OperationsAdmin]: {
    [Feature.Dashboard]: 'full',
    [Feature.Users]: 'none',
    [Feature.Earnings]: 'none',
    [Feature.Wallets]: 'none',
    [Feature.Withdrawals]: 'none',
    [Feature.Payments]: 'none',
    [Feature.Products]: 'none',
    [Feature.OrdersLogistics]: 'full',
    [Feature.Merchants]: 'full',
    [Feature.Notifications]: 'none',
    [Feature.ReportsAudit]: 'view',
    [Feature.SystemConfig]: 'none'
  },
  [AdminRole.SupportAdmin]: {
    [Feature.Dashboard]: 'full',
    [Feature.Users]: 'full',
    [Feature.Earnings]: 'none',
    [Feature.Wallets]: 'none',
    [Feature.Withdrawals]: 'none',
    [Feature.Payments]: 'none',
    [Feature.Products]: 'none',
    [Feature.OrdersLogistics]: 'none',
    [Feature.Merchants]: 'none',
    [Feature.Notifications]: 'full',
    [Feature.ReportsAudit]: 'view',
    [Feature.SystemConfig]: 'none'
  },
  [AdminRole.ReadOnlyAdmin]: {
    [Feature.Dashboard]: 'full',
    [Feature.Users]: 'view',
    [Feature.Earnings]: 'view',
    [Feature.Wallets]: 'view',
    [Feature.Withdrawals]: 'view',
    [Feature.Payments]: 'view',
    [Feature.Products]: 'view',
    [Feature.OrdersLogistics]: 'view',
    [Feature.Merchants]: 'view',
    [Feature.Notifications]: 'view',
    [Feature.ReportsAudit]: 'view',
    [Feature.SystemConfig]: 'view'
  }
};

/** Role-based action permission: true = can perform */
export const ACTION_PERMISSION_MATRIX: Record<AdminRole, Record<Action, boolean>> = {
  [AdminRole.SuperAdmin]: {
    [Action.ApproveWithdrawal]: true,
    [Action.ManualWalletAdjustment]: true,
    [Action.MarkPaymentSuccessful]: true,
    [Action.UpdateOrderStatus]: true,
    [Action.AssignMerchant]: true,
    [Action.ApproveMerchant]: true,
    [Action.SuspendUser]: true,
    [Action.ResetUserPassword]: true,
    [Action.ChangeSystemConfig]: true,
    [Action.ToggleFeatures]: true
  },
  [AdminRole.FinanceAdmin]: {
    [Action.ApproveWithdrawal]: true,
    [Action.ManualWalletAdjustment]: true,
    [Action.MarkPaymentSuccessful]: true,
    [Action.UpdateOrderStatus]: false,
    [Action.AssignMerchant]: false,
    [Action.ApproveMerchant]: false,
    [Action.SuspendUser]: false,
    [Action.ResetUserPassword]: false,
    [Action.ChangeSystemConfig]: false,
    [Action.ToggleFeatures]: false
  },
  [AdminRole.OperationsAdmin]: {
    [Action.ApproveWithdrawal]: false,
    [Action.ManualWalletAdjustment]: false,
    [Action.MarkPaymentSuccessful]: false,
    [Action.UpdateOrderStatus]: true,
    [Action.AssignMerchant]: true,
    [Action.ApproveMerchant]: true,
    [Action.SuspendUser]: false,
    [Action.ResetUserPassword]: false,
    [Action.ChangeSystemConfig]: false,
    [Action.ToggleFeatures]: false
  },
  [AdminRole.SupportAdmin]: {
    [Action.ApproveWithdrawal]: false,
    [Action.ManualWalletAdjustment]: false,
    [Action.MarkPaymentSuccessful]: false,
    [Action.UpdateOrderStatus]: false,
    [Action.AssignMerchant]: false,
    [Action.ApproveMerchant]: false,
    [Action.SuspendUser]: true,
    [Action.ResetUserPassword]: true,
    [Action.ChangeSystemConfig]: false,
    [Action.ToggleFeatures]: false
  },
  [AdminRole.ReadOnlyAdmin]: {
    [Action.ApproveWithdrawal]: false,
    [Action.ManualWalletAdjustment]: false,
    [Action.MarkPaymentSuccessful]: false,
    [Action.UpdateOrderStatus]: false,
    [Action.AssignMerchant]: false,
    [Action.ApproveMerchant]: false,
    [Action.SuspendUser]: false,
    [Action.ResetUserPassword]: false,
    [Action.ChangeSystemConfig]: false,
    [Action.ToggleFeatures]: false
  }
};
