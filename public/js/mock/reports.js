import { users } from './users.js';
import { products, productCategories, productStatus } from './products.js';
import { sales } from './sales.js';
import { stockTransactions } from './stock.js';
import { purchaseOrders, suppliers } from './purchases.js';
import { orders } from './orders.js';
import { activity } from './activity.js';
import { ROLES } from '../config/roles.js';
import { formatCurrency, formatDate, parseDate, sum } from '../utils.js';

export const REPORTS = {
  owner: [
    { id: 'user-access', name: 'User Access Report', description: 'Every account with its role, status and creation date.', icon: 'users' },
    { id: 'inventory-snapshot', name: 'Inventory Snapshot', description: 'Current quantity, minimum levels and stock status for the full catalogue.', icon: 'box' },
    { id: 'activity-audit', name: 'Activity Audit', description: 'A complete log of workspace actions across all users.', icon: 'activity' },
  ],
  product: [
    { id: 'catalogue', name: 'Product Catalogue', description: 'The complete product catalogue with pricing and stock status.', icon: 'box' },
    { id: 'low-stock', name: 'Low Stock Report', description: 'Products that are low or out of stock and need attention.', icon: 'alertTriangle' },
    { id: 'category-summary', name: 'Category Summary', description: 'Product counts, units and inventory value by category.', icon: 'layers' },
  ],
  sales: [
    { id: 'sales-summary', name: 'Sales Summary', description: 'Every recorded sale with date, seller, item count and total.', icon: 'sales' },
    { id: 'team-sales', name: 'Team Sales', description: 'Sales performance grouped by team member.', icon: 'users' },
    { id: 'daily-sales', name: 'Daily Sales', description: 'Sales count and revenue grouped by day.', icon: 'calendar' },
  ],
  stock: [
    { id: 'movements', name: 'Stock Movements', description: 'All stock-in, stock-out and adjustment transactions.', icon: 'stock' },
    { id: 'low-stock', name: 'Low Stock Report', description: 'Products at or below their minimum stock level.', icon: 'alertTriangle' },
    { id: 'adjustment-log', name: 'Adjustment Log', description: 'Every stock adjustment with its recorded reason.', icon: 'sliders' },
  ],
  purchase: [
    { id: 'purchase-orders', name: 'Purchase Orders', description: 'All purchase orders with receipt progress and value.', icon: 'purchase' },
    { id: 'supplier-directory', name: 'Supplier Directory', description: 'Supplier contacts for purchasing follow-ups.', icon: 'briefcase' },
    { id: 'monthly-spend', name: 'Monthly Spend', description: 'Purchase value grouped by calendar month.', icon: 'creditCard' },
  ],
  orders: [
    { id: 'order-register', name: 'Order Register', description: 'Every customer order with status and value.', icon: 'orders' },
    { id: 'status-summary', name: 'Status Summary', description: 'Order counts and value grouped by status.', icon: 'analytics' },
    { id: 'customer-summary', name: 'Customer Summary', description: 'Order volume and value grouped by customer.', icon: 'users' },
  ],
};

function monthKey(value) {
  const date = parseDate(value);
  if (!date) return 'Unknown';
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function getReports(roleKey) {
  return (REPORTS[roleKey] || []).map((report) => ({ ...report }));
}

export function generateReport(roleKey, reportId) {
  const definition = (REPORTS[roleKey] || []).find((report) => report.id === reportId);
  if (!definition) return null;

  let rows = [];
  let filename = definition.name.replaceAll(' ', '-').toLowerCase();

  if (definition.id === 'user-access') {
    rows = [
      ['Name', 'Email', 'Role', 'Status', 'Created'],
      ...users.map((user) => [
        user.name,
        user.email,
        ROLES[user.role]?.label || user.role,
        user.status === 'active' ? 'Active' : 'Deactivated',
        formatDate(user.createdAt),
      ]),
    ];
  }

  if (definition.id === 'inventory-snapshot' || definition.id === 'catalogue' || definition.id === 'low-stock') {
    const relevant =
      definition.id === 'low-stock'
        ? products.filter((product) => productStatus(product) !== 'In Stock')
        : products;
    rows = [
      ['Product', 'SKU', 'Category', 'Price', 'Quantity', 'Min Level', 'Status'],
      ...relevant.map((product) => [
        product.name,
        product.sku,
        product.category,
        formatCurrency(product.price),
        product.quantity,
        product.minLevel,
        productStatus(product),
      ]),
    ];
    if (definition.id === 'low-stock') filename = 'low-stock-report';
  }

  if (definition.id === 'activity-audit') {
    rows = [
      ['User', 'Role', 'Action', 'Module', 'Timestamp'],
      ...activity.map((item) => [
        item.userName,
        ROLES[item.role]?.label || item.role,
        item.action,
        item.module,
        formatDate(item.timestamp),
      ]),
    ];
  }

  if (definition.id === 'category-summary') {
    rows = [
      ['Category', 'Products', 'Units', 'Inventory Value'],
      ...productCategories.map((category) => {
        const categoryProducts = products.filter((product) => product.category === category);
        return [
          category,
          categoryProducts.length,
          sum(categoryProducts, (product) => product.quantity),
          formatCurrency(sum(categoryProducts, (product) => product.quantity * product.price)),
        ];
      }),
    ];
  }

  if (definition.id === 'sales-summary') {
    rows = [
      ['Sale ID', 'Date', 'Salesperson', 'Items', 'Total'],
      ...sales.map((sale) => [sale.id, formatDate(sale.date), sale.user, sale.items, formatCurrency(sale.total)]),
    ];
  }

  if (definition.id === 'team-sales') {
    const grouped = {};
    sales.forEach((sale) => {
      if (!grouped[sale.user]) grouped[sale.user] = { sales: 0, items: 0, revenue: 0 };
      grouped[sale.user].sales += 1;
      grouped[sale.user].items += sale.items;
      grouped[sale.user].revenue += sale.total;
    });
    rows = [
      ['Salesperson', 'Sales', 'Items', 'Revenue'],
      ...Object.entries(grouped).map(([name, data]) => [name, data.sales, data.items, formatCurrency(data.revenue)]),
    ];
  }

  if (definition.id === 'daily-sales') {
    const grouped = {};
    sales.forEach((sale) => {
      if (!grouped[sale.date]) grouped[sale.date] = { count: 0, revenue: 0 };
      grouped[sale.date].count += 1;
      grouped[sale.date].revenue += sale.total;
    });
    rows = [
      ['Date', 'Sales', 'Revenue'],
      ...Object.entries(grouped)
        .sort((a, b) => new Date(b[0]) - new Date(a[0]))
        .map(([date, data]) => [formatDate(date), data.count, formatCurrency(data.revenue)]),
    ];
  }

  if (definition.id === 'movements') {
    rows = [
      ['Transaction', 'Date', 'Product', 'Type', 'Quantity', 'User', 'Reason'],
      ...stockTransactions.map((transaction) => [
        transaction.id,
        formatDate(transaction.date),
        transaction.productName,
        transaction.type === 'in' ? 'Stock in' : transaction.type === 'out' ? 'Stock out' : 'Adjustment',
        transaction.quantity,
        transaction.user,
        transaction.reason || '—',
      ]),
    ];
  }

  if (definition.id === 'adjustment-log') {
    rows = [
      ['Transaction', 'Date', 'Product', 'New Count', 'Reason', 'User'],
      ...stockTransactions
        .filter((transaction) => transaction.type === 'adjustment')
        .map((transaction) => [
          transaction.id,
          formatDate(transaction.date),
          transaction.productName,
          transaction.quantity,
          transaction.reason,
          transaction.user,
        ]),
    ];
  }

  if (definition.id === 'purchase-orders') {
    rows = [
      ['PO', 'Supplier', 'Date', 'Status', 'Ordered', 'Received', 'Total'],
      ...purchaseOrders.map((order) => [
        order.id,
        order.supplier,
        formatDate(order.date),
        order.status,
        order.qtyOrdered,
        order.qtyReceived,
        formatCurrency(order.total),
      ]),
    ];
  }

  if (definition.id === 'supplier-directory') {
    rows = [
      ['Supplier', 'Contact', 'Email', 'Phone'],
      ...suppliers.map((supplier) => [supplier.name, supplier.contact, supplier.email, supplier.phone]),
    ];
  }

  if (definition.id === 'monthly-spend') {
    const grouped = {};
    purchaseOrders.forEach((order) => {
      const key = monthKey(order.date);
      if (!grouped[key]) grouped[key] = { orders: 0, value: 0 };
      grouped[key].orders += 1;
      grouped[key].value += order.total;
    });
    rows = [
      ['Month', 'Purchase Orders', 'Total Value'],
      ...Object.entries(grouped).map(([month, data]) => [month, data.orders, formatCurrency(data.value)]),
    ];
  }

  if (definition.id === 'order-register') {
    rows = [
      ['Order', 'Customer', 'Date', 'Status', 'Total'],
      ...orders.map((order) => [order.id, order.customer, formatDate(order.date), order.status, formatCurrency(order.total)]),
    ];
  }

  if (definition.id === 'status-summary') {
    const grouped = {};
    orders.forEach((order) => {
      if (!grouped[order.status]) grouped[order.status] = { count: 0, value: 0 };
      grouped[order.status].count += 1;
      grouped[order.status].value += order.total;
    });
    rows = [
      ['Status', 'Orders', 'Value'],
      ...Object.entries(grouped).map(([status, data]) => [status, data.count, formatCurrency(data.value)]),
    ];
  }

  if (definition.id === 'customer-summary') {
    const grouped = {};
    orders.forEach((order) => {
      if (!grouped[order.customer]) grouped[order.customer] = { count: 0, value: 0 };
      grouped[order.customer].count += 1;
      grouped[order.customer].value += order.total;
    });
    rows = [
      ['Customer', 'Orders', 'Value'],
      ...Object.entries(grouped).map(([customer, data]) => [customer, data.count, formatCurrency(data.value)]),
    ];
  }

  return { filename, rows };
}
