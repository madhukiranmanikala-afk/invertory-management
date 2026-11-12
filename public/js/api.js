import { users, findUserByLogin, findUserById, publicUser, refreshUsers, saveUsers } from './mock/users.js';
import { products, productCategories, findProductById, productStatus } from './mock/products.js';
import { stockTransactions } from './mock/stock.js';
import { suppliers, purchaseOrders, purchaseStatus } from './mock/purchases.js';
import { sales } from './mock/sales.js';
import { orders, orderStatuses } from './mock/orders.js';
import { notifications, NOTIFICATION_TYPES } from './mock/notifications.js';
import { activity, saveActivity } from './mock/activity.js';
import { getDashboard as getDashboardMock, getAnalytics as getAnalyticsMock } from './mock/dashboard.js';
import { getReports as getReportsMock, generateReport as buildReport } from './mock/reports.js';
import { getRolePermissions } from './config/permissions.js';
import { ROLES } from './config/roles.js';
import {
  todayISO,
  uid,
  formatDate,
  isWholeNumber,
  isNonNegativeNumber,
  isEmail,
  isIndianPhone,
  formatIndianPhone,
  PHONE_ERROR,
} from './utils.js';

export { NOTIFICATION_TYPES };

export class ApiError extends Error {
  constructor(message, code = 'ERROR', status = 400) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

const MIN_DELAY = 300;
const MAX_DELAY = 600;
let currentUserId = null;

function delay(min = MIN_DELAY, max = MAX_DELAY) {
  const wait = Math.floor(min + Math.random() * (max - min));
  return new Promise((resolve) => setTimeout(resolve, wait));
}

function clone(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

export function setCurrentUser(userId) {
  currentUserId = userId;
}

export function clearCurrentUser() {
  currentUserId = null;
}

function currentUser() {
  // Always read the shared record so a role change is applied straight away.
  refreshUsers();
  const user = findUserById(currentUserId);
  if (!user) {
    throw new ApiError('Your session has expired. Please sign in again.', 'UNAUTHORIZED', 401);
  }
  if (user.status !== 'active') {
    throw new ApiError('Account deactivated. Contact the Owner.', 'DEACTIVATED', 403);
  }
  return user;
}

/**
 * Live snapshot of the signed-in user, read straight from the shared record.
 * The shell, the router guard and the action buttons all use this so they
 * never work from a stale copy of the role.
 */
export function peekCurrentUser() {
  refreshUsers();
  const user = currentUserId ? findUserById(currentUserId) : null;
  return user ? publicUser(user) : null;
}

function permissionsFor(user) {
  return getRolePermissions(user.role);
}

function requirePermission(permissionKey) {
  const user = currentUser();
  if (!permissionsFor(user).includes(permissionKey)) {
    throw new ApiError('You do not have permission to perform this action.', 'FORBIDDEN', 403);
  }
  return user;
}

function requireAnyPermission(permissionKeys) {
  const user = currentUser();
  const granted = permissionsFor(user);
  if (!permissionKeys.some((key) => granted.includes(key))) {
    throw new ApiError('You do not have permission to perform this action.', 'FORBIDDEN', 403);
  }
  return user;
}

function requireText(value, label) {
  if (!String(value ?? '').trim()) {
    throw new ApiError(`${label} is required.`, 'VALIDATION', 422);
  }
}

function requireWhole(value, label) {
  if (!isWholeNumber(value)) {
    throw new ApiError(`${label} must be a whole number of 0 or more.`, 'VALIDATION', 422);
  }
}

function requireAmount(value, label) {
  if (!isNonNegativeNumber(value)) {
    throw new ApiError(`${label} must be a number of 0 or more.`, 'VALIDATION', 422);
  }
}

function logActivity(action, module, user = currentUser()) {
  activity.unshift({
    id: uid('a'),
    userId: user.id,
    userName: user.name,
    role: user.role,
    action,
    module,
    timestamp: new Date().toISOString(),
  });
  saveActivity();
}

function nextId(prefix, list) {
  const highest = list.reduce((max, item) => {
    const numeric = parseInt(String(item.id).replace(/\D/g, ''), 10);
    return Number.isFinite(numeric) && numeric > max ? numeric : max;
  }, 0);
  return `${prefix}-${highest + 1}`;
}

function normaliseProductInput(payload, existingId = null) {
  requireText(payload.name, 'Product name');
  requireText(payload.sku, 'SKU');
  requireText(payload.category, 'Category');
  if (!productCategories.includes(payload.category)) {
    throw new ApiError('Choose a valid category.', 'VALIDATION', 422);
  }
  requireAmount(payload.price, 'Price');
  requireWhole(payload.quantity, 'Quantity');
  requireWhole(payload.minLevel, 'Minimum level');
  const duplicate = products.find(
    (product) => product.sku.toLowerCase() === String(payload.sku).trim().toLowerCase() && product.id !== existingId,
  );
  if (duplicate) {
    throw new ApiError('That SKU is already used by another product.', 'VALIDATION', 422);
  }
  return {
    name: String(payload.name).trim(),
    sku: String(payload.sku).trim().toUpperCase(),
    category: payload.category,
    price: Number(payload.price),
    quantity: Number(payload.quantity),
    minLevel: Number(payload.minLevel),
  };
}

function normaliseStockInput(payload) {
  const product = findProductById(payload.productId);
  if (!product) throw new ApiError('Choose a valid product.', 'VALIDATION', 422);
  if (!['in', 'out', 'adjustment'].includes(payload.type)) {
    throw new ApiError('Choose a valid transaction type.', 'VALIDATION', 422);
  }
  requireWhole(payload.quantity, 'Quantity');
  const quantity = Number(payload.quantity);
  if (payload.type === 'adjustment' && !String(payload.reason || '').trim()) {
    throw new ApiError('A reason is required for a stock adjustment.', 'VALIDATION', 422);
  }
  return {
    productId: product.id,
    productName: product.name,
    type: payload.type,
    quantity,
    date: payload.date || todayISO(),
    user: String(payload.user || currentUser().name).trim(),
    reason: payload.type === 'adjustment' ? String(payload.reason || '').trim() : '',
  };
}

function reverseStockEffect(transaction, product) {
  if (!product) return;
  if (transaction.type === 'in') product.quantity -= transaction.quantity;
  if (transaction.type === 'out') product.quantity += transaction.quantity;
  if (transaction.type === 'adjustment') product.quantity = transaction.previousQuantity ?? product.quantity;
}

function reapplyStockEffect(transaction, product) {
  if (!product) return;
  if (transaction.type === 'in') product.quantity += transaction.quantity;
  if (transaction.type === 'out') product.quantity -= transaction.quantity;
  if (transaction.type === 'adjustment') product.quantity = transaction.quantity;
}

function applyStockEffect(type, quantity, product) {
  const previousQuantity = product.quantity;
  if (type === 'in') {
    product.quantity = previousQuantity + quantity;
  } else if (type === 'out') {
    if (quantity > previousQuantity) {
      throw new ApiError(
        `Cannot issue ${quantity} units. Only ${previousQuantity} units are available.`,
        'INSUFFICIENT_STOCK',
        422,
      );
    }
    product.quantity = previousQuantity - quantity;
  } else {
    product.quantity = quantity;
  }
  return previousQuantity;
}

/* ==========================================================================
   Authentication
   ========================================================================== */

export async function login(identifier, password) {
  await delay();
  // Sign in against the shared record so a role changed elsewhere applies.
  refreshUsers();
  const user = findUserByLogin(identifier, password);
  if (!user) {
    throw new ApiError('Invalid credentials', 'INVALID_CREDENTIALS', 401);
  }
  if (user.status !== 'active') {
    throw new ApiError('Account deactivated. Contact the Owner.', 'DEACTIVATED', 403);
  }
  currentUserId = user.id;
  logActivity('Signed in to the workspace', 'Authentication', user);
  return { user: publicUser(user), token: `mock-token-${user.id}-${Date.now()}` };
}

export async function getMe() {
  await delay();
  return publicUser(currentUser());
}

export async function getPermissions() {
  await delay();
  const user = currentUser();
  return permissionsFor(user);
}

/* ==========================================================================
   Dashboard, analytics and reports
   ========================================================================== */

export async function getDashboard(roleKey) {
  await delay();
  const user = currentUser();
  if (user.role !== roleKey) {
    throw new ApiError('You cannot view this dashboard.', 'FORBIDDEN', 403);
  }
  return clone(getDashboardMock(roleKey));
}

export async function getAnalytics(days = 30) {
  await delay();
  const user = requirePermission('analytics.view');
  return clone(getAnalyticsMock(user.role, Number(days) || 30));
}

export async function getReports() {
  await delay();
  const user = currentUser();
  return clone(getReportsMock(user.role));
}

export async function generateReport(reportId) {
  await delay();
  requirePermission('reports.generate');
  const user = currentUser();
  const result = buildReport(user.role, reportId);
  if (!result) throw new ApiError('Report not found.', 'NOT_FOUND', 404);
  logActivity(`Generated the ${reportId.replaceAll('-', ' ')} report`, 'Reports', user);
  return clone(result);
}

/* ==========================================================================
   Users (Owner)
   ========================================================================== */

export async function getUsers() {
  await delay();
  requirePermission('users.view');
  return clone(users.map(publicUser));
}

export async function createUser(payload) {
  await delay();
  requirePermission('users.create');
  requireText(payload.name, 'Name');
  requireText(payload.email, 'Email');
  if (!isEmail(payload.email)) throw new ApiError('Enter a valid email address.', 'VALIDATION', 422);
  requireText(payload.password, 'Temporary password');
  if (String(payload.password).length < 8) {
    throw new ApiError('Temporary password must be at least 8 characters.', 'VALIDATION', 422);
  }
  if (!ROLES[payload.role]) throw new ApiError('Choose a valid role.', 'VALIDATION', 422);
  if (!isIndianPhone(payload.phone)) {
    throw new ApiError(PHONE_ERROR, 'VALIDATION', 422);
  }
  if (users.some((user) => user.email.toLowerCase() === String(payload.email).trim().toLowerCase())) {
    throw new ApiError('A user with that email already exists.', 'VALIDATION', 422);
  }
  const user = {
    id: uid('u'),
    name: String(payload.name).trim(),
    email: String(payload.email).trim().toLowerCase(),
    password: payload.password,
    role: payload.role,
    status: 'active',
    phone: formatIndianPhone(payload.phone),
    avatar: '',
    createdAt: todayISO(),
    sessionVersion: 1,
  };
  users.push(user);
  saveUsers();
  const owner = currentUser();
  logActivity(`Created user ${user.name}`, 'User Management', owner);
  return publicUser(user);
}

export async function updateUser(id, payload) {
  await delay();
  requirePermission('users.update');
  const user = findUserById(id);
  if (!user) throw new ApiError('User not found.', 'NOT_FOUND', 404);
  requireText(payload.name, 'Name');
  requireText(payload.email, 'Email');
  if (!isEmail(payload.email)) throw new ApiError('Enter a valid email address.', 'VALIDATION', 422);
  const email = String(payload.email).trim().toLowerCase();
  if (!isIndianPhone(payload.phone)) {
    throw new ApiError(PHONE_ERROR, 'VALIDATION', 422);
  }
  if (users.some((other) => other.id !== id && other.email.toLowerCase() === email)) {
    throw new ApiError('A user with that email already exists.', 'VALIDATION', 422);
  }
  user.name = String(payload.name).trim();
  user.email = email;
  user.phone = formatIndianPhone(payload.phone);
  if (Object.prototype.hasOwnProperty.call(payload, 'avatar')) {
    user.avatar = String(payload.avatar || '').trim();
  }
  saveUsers();
  const owner = currentUser();
  logActivity(`Updated user ${user.name}`, 'User Management', owner);
  return publicUser(user);
}

export async function updateUserRole(id, role) {
  await delay();
  const owner = requirePermission('users.role');
  if (id === owner.id) {
    throw new ApiError('You cannot change the role of your own account.', 'FORBIDDEN', 403);
  }
  if (!ROLES[role]) throw new ApiError('Choose a valid role.', 'VALIDATION', 422);
  const user = findUserById(id);
  if (!user) throw new ApiError('User not found.', 'NOT_FOUND', 404);
  const previousRole = user.role;
  // The record is the single source of truth: the old role is dropped here and
  // the session version is bumped so any open session picks up the new role.
  user.role = role;
  user.sessionVersion = (Number(user.sessionVersion) || 1) + 1;
  saveUsers();
  logActivity(
    `Changed role of ${user.name} from ${ROLES[previousRole]?.label || previousRole} to ${ROLES[role]?.label || role}`,
    'User Management',
    owner,
  );
  return { user: publicUser(user), previousRole, newRole: role };
}

export async function updateUserStatus(id, status) {
  await delay();
  const owner = requirePermission('users.status');
  if (id === owner.id) {
    throw new ApiError('You cannot deactivate your own account.', 'FORBIDDEN', 403);
  }
  if (!['active', 'deactivated'].includes(status)) {
    throw new ApiError('Choose a valid account status.', 'VALIDATION', 422);
  }
  const user = findUserById(id);
  if (!user) throw new ApiError('User not found.', 'NOT_FOUND', 404);
  user.status = status;
  saveUsers();
  logActivity(
    `${status === 'active' ? 'Activated' : 'Deactivated'} user ${user.name}`,
    'User Management',
    owner,
  );
  return publicUser(user);
}

export async function resetUserPassword(id) {
  await delay();
  const owner = requirePermission('users.reset');
  const user = findUserById(id);
  if (!user) throw new ApiError('User not found.', 'NOT_FOUND', 404);
  const temporaryPassword = `Temp@${Math.floor(100000 + Math.random() * 900000)}`;
  user.password = temporaryPassword;
  saveUsers();
  logActivity(`Reset password for ${user.name}`, 'User Management', owner);
  return { user: publicUser(user), temporaryPassword };
}

/* ==========================================================================
   Activity and notifications
   ========================================================================== */

export async function getActivity() {
  await delay();
  const user = currentUser();
  const isOwner = user.role === 'owner';
  const rows = isOwner ? activity : activity.filter((item) => item.userId === user.id);
  return clone([...rows].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
}

export async function getNotifications() {
  await delay();
  const user = currentUser();
  const types = ROLES[user.role]?.notificationTypes || [];
  return clone(
    notifications
      .filter((notification) => types.includes(notification.type))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  );
}

export async function markNotificationRead(id) {
  await delay();
  const user = currentUser();
  const types = ROLES[user.role]?.notificationTypes || [];
  const notification = notifications.find((item) => item.id === id);
  if (!notification || !types.includes(notification.type)) {
    throw new ApiError('Notification not found.', 'NOT_FOUND', 404);
  }
  notification.read = true;
  return clone(notification);
}

export async function markAllNotificationsRead() {
  await delay();
  const user = currentUser();
  const types = ROLES[user.role]?.notificationTypes || [];
  notifications.forEach((notification) => {
    if (types.includes(notification.type)) notification.read = true;
  });
  return { success: true };
}

/* ==========================================================================
   Products
   ========================================================================== */

export async function getProducts() {
  await delay();
  // Stock managers need the product list to record transactions, but can only read it.
  requireAnyPermission(['products.view', 'stock.view']);
  return clone(products.map((product) => ({ ...product, status: productStatus(product) })));
}

export async function getProductCategories() {
  await delay(120, 220);
  requirePermission('products.view');
  return [...productCategories];
}

export async function createProduct(payload) {
  await delay();
  requirePermission('products.create');
  const data = normaliseProductInput(payload);
  const product = { id: uid('p'), ...data, createdAt: todayISO() };
  products.push(product);
  const user = currentUser();
  logActivity(`Created product ${product.name}`, 'Products', user);
  return clone({ ...product, status: productStatus(product) });
}

export async function updateProduct(id, payload) {
  await delay();
  requirePermission('products.update');
  const product = findProductById(id);
  if (!product) throw new ApiError('Product not found.', 'NOT_FOUND', 404);
  const data = normaliseProductInput(payload, id);
  Object.assign(product, data);
  const user = currentUser();
  logActivity(`Updated product ${product.name}`, 'Products', user);
  return clone({ ...product, status: productStatus(product) });
}

/* ==========================================================================
   Stock
   ========================================================================== */

export async function getStockTransactions() {
  await delay();
  requirePermission('stock.view');
  return clone([...stockTransactions].sort((a, b) => new Date(b.date) - new Date(a.date)));
}

export async function createStockTransaction(payload) {
  await delay();
  const user = requirePermission('stock.create');
  const data = normaliseStockInput(payload);
  if (data.type === 'adjustment' && !permissionsFor(user).includes('stock.adjust')) {
    throw new ApiError('You do not have permission to adjust stock.', 'FORBIDDEN', 403);
  }
  const product = findProductById(data.productId);
  const previousQuantity = applyStockEffect(data.type, data.quantity, product);
  const transaction = {
    id: nextId('STK', stockTransactions),
    ...data,
    previousQuantity,
  };
  stockTransactions.unshift(transaction);
  const action =
    data.type === 'in' ? 'Recorded stock-in' : data.type === 'out' ? 'Recorded stock-out' : 'Recorded stock adjustment';
  logActivity(`${action} for ${product.name}`, 'Stock', user);
  return clone(transaction);
}

export async function updateStockTransaction(id, payload) {
  await delay();
  const user = requirePermission('stock.update');
  const transaction = stockTransactions.find((item) => item.id === id);
  if (!transaction) throw new ApiError('Stock transaction not found.', 'NOT_FOUND', 404);
  const data = normaliseStockInput({ ...transaction, ...payload });
  if (data.type === 'adjustment' && !permissionsFor(user).includes('stock.adjust')) {
    throw new ApiError('You do not have permission to adjust stock.', 'FORBIDDEN', 403);
  }
  const oldProduct = findProductById(transaction.productId);
  const newProduct = findProductById(data.productId);
  reverseStockEffect(transaction, oldProduct);
  let previousQuantity;
  try {
    previousQuantity = applyStockEffect(data.type, data.quantity, newProduct);
  } catch (error) {
    reapplyStockEffect(transaction, oldProduct);
    throw error;
  }
  Object.assign(transaction, data, { previousQuantity });
  logActivity(`Updated stock transaction ${transaction.id}`, 'Stock', user);
  return clone(transaction);
}

/* ==========================================================================
   Suppliers and purchase orders
   ========================================================================== */

export async function getSuppliers() {
  await delay();
  requirePermission('purchases.view');
  return clone(suppliers);
}

export async function getPurchaseOrders() {
  await delay();
  requirePermission('purchases.view');
  return clone([...purchaseOrders].sort((a, b) => new Date(b.date) - new Date(a.date)));
}

function normalisePurchase(payload) {
  const supplier = suppliers.find((item) => item.id === payload.supplierId);
  if (!supplier) throw new ApiError('Choose a valid supplier.', 'VALIDATION', 422);
  requireAmount(payload.total, 'Total');
  requireWhole(payload.qtyOrdered, 'Order quantity');
  return {
    supplierId: supplier.id,
    supplier: supplier.name,
    date: payload.date || todayISO(),
    total: Number(payload.total),
    qtyOrdered: Number(payload.qtyOrdered),
  };
}

export async function createPurchaseOrder(payload) {
  await delay();
  const user = requirePermission('purchases.create');
  const data = normalisePurchase(payload);
  const order = {
    id: nextId('PO', purchaseOrders),
    ...data,
    qtyReceived: 0,
    status: 'Pending',
  };
  purchaseOrders.unshift(order);
  logActivity(`Created purchase order ${order.id}`, 'Purchase', user);
  return clone(order);
}

export async function updatePurchaseOrder(id, payload) {
  await delay();
  const user = requirePermission('purchases.update');
  const order = purchaseOrders.find((item) => item.id === id);
  if (!order) throw new ApiError('Purchase order not found.', 'NOT_FOUND', 404);
  const data = normalisePurchase({ ...order, ...payload });
  if (order.qtyReceived > data.qtyOrdered) {
    throw new ApiError('Order quantity cannot be lower than the quantity already received.', 'VALIDATION', 422);
  }
  Object.assign(order, data, { status: purchaseStatus(data.qtyOrdered, order.qtyReceived) });
  logActivity(`Updated purchase order ${order.id}`, 'Purchase', user);
  return clone(order);
}

export async function receivePurchaseOrder(id, quantity) {
  await delay();
  const user = requirePermission('purchases.receive');
  const order = purchaseOrders.find((item) => item.id === id);
  if (!order) throw new ApiError('Purchase order not found.', 'NOT_FOUND', 404);
  if (order.status === 'Received') {
    throw new ApiError('This purchase order has already been fully received.', 'VALIDATION', 422);
  }
  if (!isWholeNumber(quantity) || Number(quantity) <= 0) {
    throw new ApiError('Received quantity must be a whole number greater than 0.', 'VALIDATION', 422);
  }
  const remaining = order.qtyOrdered - order.qtyReceived;
  if (Number(quantity) > remaining) {
    throw new ApiError(`Received quantity exceeds the ${remaining} units still due.`, 'VALIDATION', 422);
  }
  order.qtyReceived += Number(quantity);
  order.status = purchaseStatus(order.qtyOrdered, order.qtyReceived);
  logActivity(`Received ${quantity} units on purchase order ${order.id}`, 'Purchase', user);
  return clone(order);
}

/* ==========================================================================
   Sales
   ========================================================================== */

export async function getSales() {
  await delay();
  requirePermission('sales.view');
  return clone([...sales].sort((a, b) => new Date(b.date) - new Date(a.date)));
}

function normaliseSale(payload) {
  requireText(payload.user, 'Salesperson');
  requireWhole(payload.items, 'Items');
  requireAmount(payload.total, 'Total');
  return {
    date: payload.date || todayISO(),
    user: String(payload.user).trim(),
    items: Number(payload.items),
    total: Number(payload.total),
  };
}

export async function createSale(payload) {
  await delay();
  const user = requirePermission('sales.create');
  const data = normaliseSale(payload);
  const sale = { id: nextId('SALE', sales), ...data };
  sales.unshift(sale);
  logActivity(`Created sale ${sale.id}`, 'Sales', user);
  return clone(sale);
}

export async function updateSale(id, payload) {
  await delay();
  const user = requirePermission('sales.update');
  const sale = sales.find((item) => item.id === id);
  if (!sale) throw new ApiError('Sale not found.', 'NOT_FOUND', 404);
  Object.assign(sale, normaliseSale({ ...sale, ...payload }));
  logActivity(`Updated sale ${sale.id}`, 'Sales', user);
  return clone(sale);
}

/* ==========================================================================
   Orders
   ========================================================================== */

export async function getOrders() {
  await delay();
  requirePermission('orders.view');
  return clone([...orders].sort((a, b) => new Date(b.date) - new Date(a.date)));
}

function normaliseOrder(payload) {
  requireText(payload.customer, 'Customer');
  requireAmount(payload.total, 'Total');
  if (!orderStatuses.includes(payload.status)) {
    throw new ApiError('Choose a valid order status.', 'VALIDATION', 422);
  }
  return {
    customer: String(payload.customer).trim(),
    date: payload.date || todayISO(),
    status: payload.status,
    total: Number(payload.total),
  };
}

export async function createOrder(payload) {
  await delay();
  const user = requirePermission('orders.create');
  const data = normaliseOrder(payload);
  const order = { id: nextId('ORD', orders), ...data };
  orders.unshift(order);
  logActivity(`Created order ${order.id}`, 'Orders', user);
  return clone(order);
}

export async function updateOrder(id, payload) {
  await delay();
  const user = requirePermission('orders.update');
  const order = orders.find((item) => item.id === id);
  if (!order) throw new ApiError('Order not found.', 'NOT_FOUND', 404);
  Object.assign(order, normaliseOrder({ ...order, ...payload }));
  logActivity(`Updated order ${order.id}`, 'Orders', user);
  return clone(order);
}

export async function updateOrderStatus(id, status) {
  await delay();
  const user = requirePermission('orders.status');
  const order = orders.find((item) => item.id === id);
  if (!order) throw new ApiError('Order not found.', 'NOT_FOUND', 404);
  if (!orderStatuses.includes(status)) throw new ApiError('Choose a valid order status.', 'VALIDATION', 422);
  order.status = status;
  logActivity(`Changed order ${order.id} status to ${status}`, 'Orders', user);
  return clone(order);
}

/* ==========================================================================
   Profile, settings and support
   ========================================================================== */

export async function getProfile() {
  await delay();
  return publicUser(currentUser());
}

export async function updateProfile(payload) {
  await delay();
  const user = requirePermission('profile.update');
  requireText(payload.name, 'Name');
  if (!isIndianPhone(payload.phone)) {
    throw new ApiError(PHONE_ERROR, 'VALIDATION', 422);
  }
  user.name = String(payload.name).trim();
  user.phone = formatIndianPhone(payload.phone);
  if (Object.prototype.hasOwnProperty.call(payload, 'avatar')) {
    user.avatar = String(payload.avatar || '').trim();
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'photo')) {
    const photo = String(payload.photo || '');
    if (photo && !/^data:image\/(jpeg|png|webp);base64,/.test(photo)) {
      throw new ApiError('Choose a valid profile photo.', 'VALIDATION', 422);
    }
    user.photo = photo;
  }
  saveUsers();
  logActivity('Updated profile details', 'Profile', user);
  return publicUser(user);
}

export async function changePassword(currentPassword, newPassword) {
  await delay();
  const user = currentUser();
  if (user.password !== currentPassword) {
    throw new ApiError('Your current password is incorrect.', 'VALIDATION', 422);
  }
  if (String(newPassword).length < 8) {
    throw new ApiError('New password must be at least 8 characters.', 'VALIDATION', 422);
  }
  if (newPassword === currentPassword) {
    throw new ApiError('Choose a password that is different from your current one.', 'VALIDATION', 422);
  }
  user.password = newPassword;
  saveUsers();
  logActivity('Changed account password', 'Settings', user);
  return { success: true };
}

export async function submitContact(payload) {
  await delay();
  currentUser();
  requireText(payload.name, 'Name');
  requireText(payload.email, 'Email');
  if (!isEmail(payload.email)) throw new ApiError('Enter a valid email address.', 'VALIDATION', 422);
  requireText(payload.subject, 'Subject');
  requireText(payload.message, 'Message');
  const ticketId = `SUP-${Math.floor(100000 + Math.random() * 900000)}`;
  return { ticketId, receivedAt: new Date().toISOString() };
}

export function formatActivityTimestamp(value) {
  return formatDate(value);
}
