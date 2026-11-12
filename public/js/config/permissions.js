/**
 * Action-level permissions.
 * Edit this file to grant or revoke actions per role. The UI reads these
 * lists through api.getPermissions() and hides actions that are not present.
 */
export const ROLE_PERMISSIONS = {
  owner: [
    'users.view',
    'users.create',
    'users.update',
    'users.role',
    'users.status',
    'users.reset',
    // Read-only visibility into every operational module
    'products.view',
    'sales.view',
    'stock.view',
    'purchases.view',
    'orders.view',
    'analytics.view',
    'reports.generate',
    'notifications.view',
    'activity.view.all',
    'profile.update',
    'settings.manage',
  ],
  product: [
    'products.view',
    'products.create',
    'products.update',
    'analytics.view',
    'reports.generate',
    'notifications.view',
    'profile.update',
    'settings.manage',
  ],
  sales: [
    'sales.view',
    'sales.create',
    'sales.update',
    'analytics.view',
    'reports.generate',
    'notifications.view',
    'profile.update',
    'settings.manage',
  ],
  stock: [
    'stock.view',
    'stock.create',
    'stock.update',
    'stock.adjust',
    'analytics.view',
    'reports.generate',
    'notifications.view',
    'profile.update',
    'settings.manage',
  ],
  purchase: [
    'purchases.view',
    'purchases.create',
    'purchases.update',
    'purchases.receive',
    'analytics.view',
    'reports.generate',
    'notifications.view',
    'profile.update',
    'settings.manage',
  ],
  orders: [
    'orders.view',
    'orders.create',
    'orders.update',
    'orders.status',
    'analytics.view',
    'reports.generate',
    'notifications.view',
    'profile.update',
    'settings.manage',
  ],
};

export function getRolePermissions(roleKey) {
  return [...(ROLE_PERMISSIONS[roleKey] || [])];
}

export function hasPermission(permissionList, permissionKey) {
  if (!Array.isArray(permissionList)) return false;
  return permissionList.includes(permissionKey);
}
