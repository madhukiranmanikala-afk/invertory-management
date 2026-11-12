import { dateTimeDaysAgo } from '../utils.js';

function entry(id, userId, userName, role, action, module, timestamp) {
  return { id, userId, userName, role, action, module, timestamp };
}

const seedActivity = [
  entry('a-001', 'u-001', 'Ava Thompson', 'owner', 'Signed in to the workspace', 'Authentication', dateTimeDaysAgo(0, 1)),
  entry('a-002', 'u-006', 'Ethan Brooks', 'orders', 'Changed order ORD-5127 status to Processing', 'Orders', dateTimeDaysAgo(0, 2)),
  entry('a-003', 'u-004', 'Noah Kim', 'stock', 'Recorded stock-in transaction STK-3101', 'Stock', dateTimeDaysAgo(0, 3)),
  entry('a-004', 'u-003', 'Sofia Reyes', 'sales', 'Created sale SALE-1042', 'Sales', dateTimeDaysAgo(0, 4)),
  entry('a-005', 'u-002', 'Liam Carter', 'product', 'Updated product Lumina LED Strip', 'Products', dateTimeDaysAgo(0, 5)),
  entry('a-006', 'u-001', 'Ava Thompson', 'owner', 'Changed role of Marcus Webb from Sales Manager to Order Manager', 'User Management', dateTimeDaysAgo(1, 1)),
  entry('a-007', 'u-005', 'Mia Patel', 'purchase', 'Received purchase order PO-2080', 'Purchase', dateTimeDaysAgo(1, 2)),
  entry('a-008', 'u-010', 'Lucas Silva', 'stock', 'Adjusted stock for STK-3096 after cycle count', 'Stock', dateTimeDaysAgo(1, 3)),
  entry('a-009', 'u-009', 'Priya Nair', 'orders', 'Created order ORD-5128', 'Orders', dateTimeDaysAgo(1, 4)),
  entry('a-010', 'u-008', 'Jonah Reed', 'sales', 'Created sale SALE-1039', 'Sales', dateTimeDaysAgo(1, 5)),
  entry('a-011', 'u-011', 'Grace Chen', 'product', 'Updated catalogue pricing for five products', 'Products', dateTimeDaysAgo(2, 1)),
  entry('a-012', 'u-001', 'Ava Thompson', 'owner', 'Deactivated user Hana Sato', 'User Management', dateTimeDaysAgo(2, 2)),
  entry('a-013', 'u-012', 'Daniel Mensah', 'purchase', 'Created purchase order PO-2079', 'Purchase', dateTimeDaysAgo(2, 3)),
  entry('a-014', 'u-004', 'Noah Kim', 'stock', 'Received 10 units of Solstice 27" Monitor', 'Stock', dateTimeDaysAgo(3, 1)),
  entry('a-015', 'u-006', 'Ethan Brooks', 'orders', 'Changed order ORD-5123 status to Completed', 'Orders', dateTimeDaysAgo(3, 2)),
  entry('a-016', 'u-013', 'Isabella Rossi', 'sales', 'Created sale SALE-1034', 'Sales', dateTimeDaysAgo(3, 3)),
  entry('a-017', 'u-002', 'Liam Carter', 'product', 'Created product Lumina LED Strip', 'Products', dateTimeDaysAgo(4, 1)),
  entry('a-018', 'u-001', 'Ava Thompson', 'owner', 'Changed role of Grace Chen from Sales Manager to Product Manager', 'User Management', dateTimeDaysAgo(4, 2)),
  entry('a-019', 'u-005', 'Mia Patel', 'purchase', 'Updated supplier Northwind Supply Co.', 'Purchase', dateTimeDaysAgo(4, 3)),
  entry('a-020', 'u-010', 'Lucas Silva', 'stock', 'Recorded adjustment transaction STK-3091', 'Stock', dateTimeDaysAgo(5, 1)),
  entry('a-021', 'u-009', 'Priya Nair', 'orders', 'Changed order ORD-5119 status to Cancelled', 'Orders', dateTimeDaysAgo(5, 2)),
  entry('a-022', 'u-003', 'Sofia Reyes', 'sales', 'Exported the sales summary report', 'Reports', dateTimeDaysAgo(5, 3)),
  entry('a-023', 'u-011', 'Grace Chen', 'product', 'Generated the low stock report', 'Reports', dateTimeDaysAgo(6, 1)),
  entry('a-024', 'u-001', 'Ava Thompson', 'owner', 'Viewed the business overview dashboard', 'Dashboard', dateTimeDaysAgo(6, 2)),
  entry('a-025', 'u-012', 'Daniel Mensah', 'purchase', 'Received purchase order PO-2077', 'Purchase', dateTimeDaysAgo(7, 1)),
  entry('a-026', 'u-004', 'Noah Kim', 'stock', 'Generated the stock movements report', 'Reports', dateTimeDaysAgo(7, 2)),
  entry('a-027', 'u-006', 'Ethan Brooks', 'orders', 'Signed in to the workspace', 'Authentication', dateTimeDaysAgo(8, 1)),
  entry('a-028', 'u-008', 'Jonah Reed', 'sales', 'Signed in to the workspace', 'Authentication', dateTimeDaysAgo(8, 2)),
  entry('a-029', 'u-002', 'Liam Carter', 'product', 'Signed in to the workspace', 'Authentication', dateTimeDaysAgo(9, 1)),
  entry('a-030', 'u-001', 'Ava Thompson', 'owner', 'Reset password for Lucas Silva', 'User Management', dateTimeDaysAgo(9, 2)),
  entry('a-031', 'u-005', 'Mia Patel', 'purchase', 'Signed in to the workspace', 'Authentication', dateTimeDaysAgo(10, 1)),
  entry('a-032', 'u-010', 'Lucas Silva', 'stock', 'Signed in to the workspace', 'Authentication', dateTimeDaysAgo(10, 2)),
  entry('a-033', 'u-009', 'Priya Nair', 'orders', 'Created order ORD-5114', 'Orders', dateTimeDaysAgo(11, 1)),
  entry('a-034', 'u-003', 'Sofia Reyes', 'sales', 'Created sale SALE-1027', 'Sales', dateTimeDaysAgo(12, 1)),
  entry('a-035', 'u-002', 'Liam Carter', 'product', 'Updated product Timber Standing Desk', 'Products', dateTimeDaysAgo(13, 1)),
  entry('a-036', 'u-001', 'Ava Thompson', 'owner', 'Created user Isabella Rossi', 'User Management', dateTimeDaysAgo(14, 1)),
  entry('a-037', 'u-012', 'Daniel Mensah', 'purchase', 'Updated purchase order PO-2071', 'Purchase', dateTimeDaysAgo(15, 1)),
  entry('a-038', 'u-004', 'Noah Kim', 'stock', 'Completed a warehouse cycle count', 'Stock', dateTimeDaysAgo(17, 1)),
  entry('a-039', 'u-013', 'Isabella Rossi', 'sales', 'Signed in to the workspace', 'Authentication', dateTimeDaysAgo(19, 1)),
  entry('a-040', 'u-006', 'Ethan Brooks', 'orders', 'Generated the order status report', 'Reports', dateTimeDaysAgo(21, 1)),
  entry('a-041', 'u-001', 'Ava Thompson', 'owner', 'Signed in to the workspace', 'Authentication', dateTimeDaysAgo(24, 1)),
  entry('a-042', 'u-011', 'Grace Chen', 'product', 'Signed in to the workspace', 'Authentication', dateTimeDaysAgo(28, 1)),
  entry('a-043', 'u-008', 'Jonah Reed', 'sales', 'Updated sale SALE-1023', 'Sales', dateTimeDaysAgo(31, 2)),
  entry('a-044', 'u-005', 'Mia Patel', 'purchase', 'Created purchase order PO-2068', 'Purchase', dateTimeDaysAgo(35, 1)),
  entry('a-045', 'u-004', 'Noah Kim', 'stock', 'Recorded stock-out transaction STK-3079', 'Stock', dateTimeDaysAgo(38, 1)),
];

const ACTIVITY_STORAGE_KEY = 'inventory-demo-activity';

function storage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function readStoredActivity() {
  try {
    const raw = storage()?.getItem(ACTIVITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** The single shared activity log every module reads from. */
export const activity = readStoredActivity() || seedActivity;

/** Persist the activity log so recorded changes survive a page refresh. */
export function saveActivity() {
  try {
    storage()?.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(activity));
  } catch {
    /* storage unavailable — the demo data simply stays in memory */
  }
}
