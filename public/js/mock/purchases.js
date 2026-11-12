import { dateDaysAgo } from '../utils.js';

export const suppliers = [
  { id: 'sup-01', name: 'Northwind Supply Co.', contact: 'Laura Simmons', email: 'laura@northwindsupply.com', phone: '+91 98765 43225' },
  { id: 'sup-02', name: 'Meridian Wholesale', contact: 'Victor Hale', email: 'victor@meridianwholesale.com', phone: '+91 98765 43226' },
  { id: 'sup-03', name: 'Harbor Goods', contact: 'Nina Park', email: 'nina@harborgoods.com', phone: '+91 98765 43227' },
  { id: 'sup-04', name: 'Brightline Imports', contact: 'Omar Haddad', email: 'omar@brightlineimports.com', phone: '+91 98765 43228' },
  { id: 'sup-05', name: 'Summit Distribution', contact: 'Ruth Alvarez', email: 'ruth@summitdistribution.com', phone: '+91 98765 43229' },
  { id: 'sup-06', name: 'Cedar & Co.', contact: 'Peter Lindqvist', email: 'peter@cedarandco.com', phone: '+91 98765 43230' },
  { id: 'sup-07', name: 'Atlas Trade Partners', contact: 'Amara Okafor', email: 'amara@atlastrade.com', phone: '+91 98765 43231' },
  { id: 'sup-08', name: 'Vertex Sourcing', contact: 'Kenji Mori', email: 'kenji@vertexsourcing.com', phone: '+91 98765 43232' },
];

export function purchaseStatus(qtyOrdered, qtyReceived) {
  const ordered = Number(qtyOrdered) || 0;
  const received = Number(qtyReceived) || 0;
  if (received <= 0) return 'Pending';
  if (received >= ordered) return 'Received';
  return 'Partially Received';
}

function order(id, supplierId, date, qtyOrdered, qtyReceived, total) {
  const supplier = suppliers.find((item) => item.id === supplierId);
  return {
    id,
    supplierId,
    supplier: supplier.name,
    date,
    qtyOrdered,
    qtyReceived,
    status: purchaseStatus(qtyOrdered, qtyReceived),
    total,
  };
}

export const purchaseOrders = [
  order('PO-2081', 'sup-01', dateDaysAgo(0), 40, 40, 2450),
  order('PO-2080', 'sup-02', dateDaysAgo(0), 30, 12, 1890),
  order('PO-2079', 'sup-03', dateDaysAgo(1), 20, 0, 980),
  order('PO-2078', 'sup-04', dateDaysAgo(2), 15, 15, 1315.5),
  order('PO-2077', 'sup-05', dateDaysAgo(3), 25, 10, 1675),
  order('PO-2076', 'sup-06', dateDaysAgo(4), 50, 0, 2840),
  order('PO-2075', 'sup-07', dateDaysAgo(5), 12, 12, 748.25),
  order('PO-2074', 'sup-08', dateDaysAgo(6), 18, 0, 1125),
  order('PO-2073', 'sup-01', dateDaysAgo(8), 35, 35, 2190),
  order('PO-2072', 'sup-03', dateDaysAgo(10), 22, 8, 1064),
  order('PO-2071', 'sup-02', dateDaysAgo(12), 40, 40, 2980.75),
  order('PO-2070', 'sup-04', dateDaysAgo(15), 16, 0, 864),
  order('PO-2069', 'sup-05', dateDaysAgo(18), 28, 28, 1932),
  order('PO-2068', 'sup-06', dateDaysAgo(22), 45, 15, 2571.5),
  order('PO-2067', 'sup-07', dateDaysAgo(27), 10, 10, 615),
  order('PO-2066', 'sup-08', dateDaysAgo(33), 24, 24, 1488),
  order('PO-2065', 'sup-01', dateDaysAgo(41), 30, 30, 1845),
  order('PO-2064', 'sup-03', dateDaysAgo(52), 20, 20, 940),
];
