import { dateTimeDaysAgo } from '../utils.js';

export const NOTIFICATION_TYPES = {
  low_stock: { label: 'Low stock', icon: 'alertTriangle' },
  expiry: { label: 'Expiry', icon: 'calendar' },
  order: { label: 'Order', icon: 'orders' },
};

export const notifications = [
  { id: 'n-001', type: 'order', title: 'New order received', message: 'Northwind Retail placed order ORD-5128 worth ₹842.50.', createdAt: dateTimeDaysAgo(0, 1), read: false },
  { id: 'n-002', type: 'low_stock', title: 'Nimbus Mechanical Keyboard is out of stock', message: '0 units remain. Minimum level is 8 units.', createdAt: dateTimeDaysAgo(0, 2), read: false },
  { id: 'n-003', type: 'low_stock', title: 'Vertex Wireless Mouse is running low', message: '8 units left, below the minimum level of 10.', createdAt: dateTimeDaysAgo(0, 4), read: false },
  { id: 'n-004', type: 'order', title: 'Order ORD-5126 is being processed', message: 'Pinecrest Offices order moved to processing.', createdAt: dateTimeDaysAgo(1, 2), read: false },
  { id: 'n-005', type: 'expiry', title: 'Flux Gel Pens batch expires in 14 days', message: 'Batch FLX-0921 should be prioritised for dispatch.', createdAt: dateTimeDaysAgo(1, 6), read: false },
  { id: 'n-006', type: 'low_stock', title: 'Vault Filing Cabinet needs restocking', message: '4 units left, below the minimum level of 6.', createdAt: dateTimeDaysAgo(2, 1), read: true },
  { id: 'n-007', type: 'order', title: 'Order ORD-5119 was cancelled', message: 'Nova Design Group cancelled an order worth ₹429.50.', createdAt: dateTimeDaysAgo(2, 7), read: false },
  { id: 'n-008', type: 'order', title: 'Purchase order PO-2079 awaiting receipt', message: 'Harbor Goods has not delivered 20 ordered units.', createdAt: dateTimeDaysAgo(3, 3), read: true },
  { id: 'n-009', type: 'low_stock', title: 'Drift Ergonomic Footrest is running low', message: '3 units left, below the minimum level of 6.', createdAt: dateTimeDaysAgo(3, 8), read: false },
  { id: 'n-010', type: 'expiry', title: 'Summit Whiteboard cleaner expires in 21 days', message: 'Batch SW-1104 is approaching its use-by date.', createdAt: dateTimeDaysAgo(4, 2), read: true },
  { id: 'n-011', type: 'order', title: 'Order ORD-5123 completed', message: 'Cobalt Labs order worth ₹2,145.50 was delivered.', createdAt: dateTimeDaysAgo(5, 4), read: true },
  { id: 'n-012', type: 'low_stock', title: 'Cedar Desk Organizer is running low', message: '6 units left, below the minimum level of 8.', createdAt: dateTimeDaysAgo(6, 1), read: true },
  { id: 'n-013', type: 'expiry', title: 'Pinnacle Notebook adhesive expires in 30 days', message: 'Batch PNS-0318 should be sold before December.', createdAt: dateTimeDaysAgo(7, 5), read: true },
  { id: 'n-014', type: 'order', title: 'Purchase order PO-2080 partially received', message: 'Meridian Wholesale delivered 12 of 30 units.', createdAt: dateTimeDaysAgo(8, 2), read: true },
  { id: 'n-015', type: 'order', title: '5 new orders need review', message: 'Orders received overnight are waiting for processing.', createdAt: dateTimeDaysAgo(9, 3), read: true },
  { id: 'n-016', type: 'low_stock', title: 'Echo Conference Speaker is out of stock', message: '0 units remain. Minimum level is 5 units.', createdAt: dateTimeDaysAgo(10, 6), read: true },
  { id: 'n-017', type: 'expiry', title: 'Atlas Storage Bin label stock expires soon', message: 'Batch ASB-2210 expires in 45 days.', createdAt: dateTimeDaysAgo(12, 2), read: true },
  { id: 'n-018', type: 'order', title: 'Order ORD-5113 cancelled', message: 'Redwood Schools cancelled an order worth ₹678.00.', createdAt: dateTimeDaysAgo(14, 4), read: true },
];
