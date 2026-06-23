/**
 * Dynamic RBAC permission mappings.
 * Permission keys are seeded by the backend — see BACKEND_RBAC_API.md.
 *
 * @deprecated FEATURE_ACCESS_MATRIX and ACTION_PERMISSION_MATRIX — legacy mock role
 * matrices replaced by login effectivePermissions. Kept for reference only.
 */

import { Feature, Action } from '../models/admin-permission.model';

/** Minimum view permission required to access a feature route */
export const FEATURE_MIN_VIEW_PERMISSION: Record<Feature, string> = {
  [Feature.Dashboard]: 'dashboard.view',
  [Feature.Users]: 'users.view',
  [Feature.Earnings]: 'earnings.view',
  [Feature.Wallets]: 'wallets.view',
  [Feature.Withdrawals]: 'withdrawals.view',
  [Feature.Payments]: 'payments.view',
  [Feature.Products]: 'products.view',
  [Feature.OrdersLogistics]: 'orders.view',
  [Feature.Merchants]: 'merchants.view',
  [Feature.Notifications]: 'notifications.view',
  [Feature.ReportsAudit]: 'reports.view',
  [Feature.SystemConfig]: 'system.view',
  [Feature.AdminManagement]: 'admin_management.view',
};

/** Maps legacy Action enum values to backend permission keys */
export const ACTION_TO_PERMISSION_KEY: Record<Action, string | string[]> = {
  [Action.ApproveWithdrawal]: 'withdrawals.approve',
  [Action.ManualWalletAdjustment]: 'wallets.adjust_funds',
  [Action.MarkPaymentSuccessful]: 'payments.mark_successful',
  [Action.UpdateOrderStatus]: 'orders.update_status',
  [Action.AssignMerchant]: 'merchants.assign',
  [Action.ApproveMerchant]: 'merchants.approve',
  [Action.SuspendUser]: 'users.suspend',
  [Action.ResetUserPassword]: 'users.reset_password',
  [Action.UpdateEarningsConfig]: [
    'earnings.configure_packages',
    'earnings.configure_bonuses',
    'earnings.configure_ranking',
    'earnings.configure_cpv',
  ],
  [Action.ChangeSystemConfig]: [
    'system.edit_general',
    'system.edit_financial',
    'system.edit_currency',
    'system.edit_thresholds',
    'system.edit_api',
  ],
  [Action.ToggleFeatures]: 'system.toggle_features',
};
