export const ROLES = {
  owner: {
    key: 'owner',
    label: 'Owner',
    accent: '#0e7490',
    accentStrong: '#0891b2',
    accentLight: '#67e8f9',
    moduleLabel: 'User Management',
    modulePath: '/users',
    moduleIcon: 'users',
    moduleKey: 'users',
    overviewTitle: 'Business Overview',
    welcome: 'A live view of your people, products and stock health.',
    kpis: [
      { key: 'totalUsers', label: 'Total users', icon: 'users', format: 'number', hint: 'All accounts' },
      { key: 'activeUsers', label: 'Active users', icon: 'userCheck', format: 'number', hint: 'Can sign in' },
      { key: 'totalProducts', label: 'Total products', icon: 'box', format: 'number', hint: 'Across all categories' },
      { key: 'lowStockItems', label: 'Low-stock items', icon: 'alertTriangle', format: 'number', hint: 'Needs attention' },
    ],
    notificationTypes: ['low_stock', 'expiry', 'order'],
    routes: ['/dashboard', '/users', '/products', '/sales', '/stock', '/purchase', '/orders', '/analytics', '/reports', '/notifications', '/activity', '/profile', '/settings', '/help'],
    readOnlyModules: [
      { label: 'Products', path: '/products', icon: 'box' },
      { label: 'Sales', path: '/sales', icon: 'sales' },
      { label: 'Stock', path: '/stock', icon: 'stock' },
      { label: 'Purchase', path: '/purchase', icon: 'purchase' },
      { label: 'Orders', path: '/orders', icon: 'orders' },
    ],
  },
  product: {
    key: 'product',
    label: 'Product Manager',
    accent: '#b45309',
    accentStrong: '#f59e0b',
    accentLight: '#fcd34d',
    moduleLabel: 'Products',
    modulePath: '/products',
    moduleIcon: 'box',
    moduleKey: 'products',
    overviewTitle: 'Products Overview',
    welcome: 'Your catalogue health, stock levels and category mix at a glance.',
    kpis: [
      { key: 'totalProducts', label: 'Total products', icon: 'box', format: 'number', hint: 'Catalogue size' },
      { key: 'categories', label: 'Categories', icon: 'layers', format: 'number', hint: 'Active groups' },
      { key: 'outOfStock', label: 'Out of stock', icon: 'xCircle', format: 'number', hint: 'Unavailable now' },
      { key: 'lowStock', label: 'Low stock', icon: 'alertTriangle', format: 'number', hint: 'At or below min level' },
    ],
    notificationTypes: ['low_stock', 'expiry'],
    routes: ['/dashboard', '/products', '/analytics', '/reports', '/notifications', '/activity', '/profile', '/settings', '/help'],
  },
  sales: {
    key: 'sales',
    label: 'Sales Manager',
    accent: '#15803d',
    accentStrong: '#22c55e',
    accentLight: '#86efac',
    moduleLabel: 'Sales',
    modulePath: '/sales',
    moduleIcon: 'sales',
    moduleKey: 'sales',
    overviewTitle: 'Sales Overview',
    welcome: 'Track revenue, completed sales and the products moving fastest.',
    kpis: [
      { key: 'todaySales', label: "Today's sales", icon: 'creditCard', format: 'currency', hint: 'Captured today' },
      { key: 'monthlySales', label: 'Monthly sales', icon: 'trendingUp', format: 'currency', hint: 'This month to date' },
      { key: 'completedSales', label: 'Completed sales', icon: 'checkCircle', format: 'number', hint: 'All time' },
      { key: 'topProducts', label: 'Top products', icon: 'award', format: 'text', hint: 'Best sellers this month' },
    ],
    notificationTypes: ['order'],
    routes: ['/dashboard', '/sales', '/analytics', '/reports', '/notifications', '/activity', '/profile', '/settings', '/help'],
  },
  stock: {
    key: 'stock',
    label: 'Stock Manager',
    accent: '#6d28d9',
    accentStrong: '#8b5cf6',
    accentLight: '#c4b5fd',
    moduleLabel: 'Stock',
    modulePath: '/stock',
    moduleIcon: 'stock',
    moduleKey: 'stock',
    overviewTitle: 'Stock Overview',
    welcome: 'Monitor every movement in and out of the warehouse.',
    kpis: [
      { key: 'stockIn', label: 'Stock in', icon: 'arrowDownCircle', format: 'number', hint: 'Units received this month' },
      { key: 'stockOut', label: 'Stock out', icon: 'arrowUpCircle', format: 'number', hint: 'Units issued this month' },
      { key: 'adjustments', label: 'Adjustments', icon: 'sliders', format: 'number', hint: 'Counts corrected' },
      { key: 'stockAlerts', label: 'Stock alerts', icon: 'alertTriangle', format: 'number', hint: 'Low and out of stock' },
    ],
    notificationTypes: ['low_stock', 'expiry'],
    routes: ['/dashboard', '/stock', '/analytics', '/reports', '/notifications', '/activity', '/profile', '/settings', '/help'],
  },
  purchase: {
    key: 'purchase',
    label: 'Purchase Manager',
    accent: '#c2410c',
    accentStrong: '#fb923c',
    accentLight: '#fdba74',
    moduleLabel: 'Purchase',
    modulePath: '/purchase',
    moduleIcon: 'purchase',
    moduleKey: 'purchase',
    overviewTitle: 'Purchase Overview',
    welcome: 'Keep suppliers moving and purchase orders on schedule.',
    kpis: [
      { key: 'openOrders', label: 'Open purchase orders', icon: 'purchase', format: 'number', hint: 'Pending or partial' },
      { key: 'pendingReceipts', label: 'Pending receipts', icon: 'truck', format: 'number', hint: 'Awaiting delivery' },
      { key: 'suppliers', label: 'Suppliers', icon: 'briefcase', format: 'number', hint: 'Active partners' },
      { key: 'monthlyValue', label: 'Monthly purchase value', icon: 'creditCard', format: 'currency', hint: 'This month' },
    ],
    notificationTypes: ['order', 'low_stock'],
    routes: ['/dashboard', '/purchase', '/analytics', '/reports', '/notifications', '/activity', '/profile', '/settings', '/help'],
  },
  orders: {
    key: 'orders',
    label: 'Order Manager',
    accent: '#be185d',
    accentStrong: '#ec4899',
    accentLight: '#f9a8d4',
    moduleLabel: 'Orders',
    modulePath: '/orders',
    moduleIcon: 'orders',
    moduleKey: 'orders',
    overviewTitle: 'Orders Overview',
    welcome: 'Follow every order from arrival to fulfilment.',
    kpis: [
      { key: 'newOrders', label: 'New orders', icon: 'plusCircle', format: 'number', hint: 'Just received' },
      { key: 'processing', label: 'Processing', icon: 'refresh', format: 'number', hint: 'Being prepared' },
      { key: 'completed', label: 'Completed', icon: 'checkCircle', format: 'number', hint: 'Delivered successfully' },
      { key: 'cancelled', label: 'Cancelled', icon: 'xCircle', format: 'number', hint: 'This month' },
    ],
    notificationTypes: ['order'],
    routes: ['/dashboard', '/orders', '/analytics', '/reports', '/notifications', '/activity', '/profile', '/settings', '/help'],
  },
};

export const ROLE_KEYS = Object.keys(ROLES);

export function getRole(roleKey) {
  return ROLES[roleKey] || null;
}

export function getNavItems(roleKey) {
  const role = getRole(roleKey);
  if (!role) return [];
  return [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: role.moduleLabel, path: role.modulePath, icon: role.moduleIcon },
    ...(role.readOnlyModules || []).map((item) => ({ ...item, readOnly: true })),
    { label: 'Analytics', path: '/analytics', icon: 'analytics' },
    { label: 'Reports', path: '/reports', icon: 'reports' },
    { label: 'Notifications', path: '/notifications', icon: 'bell', badge: true },
    { label: 'Activity History', path: '/activity', icon: 'activity' },
    { label: 'My Profile', path: '/profile', icon: 'user' },
    { label: 'Settings', path: '/settings', icon: 'settings' },
    { label: 'Help & Support', path: '/help', icon: 'help' },
  ];
}

export function canAccess(roleKey, path) {
  const role = getRole(roleKey);
  if (!role) return false;
  if (path === '/403') return true;
  return role.routes.includes(path);
}
