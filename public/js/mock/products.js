export const productCategories = ['Electronics', 'Accessories', 'Office', 'Furniture', 'Storage'];

export const products = [
  { id: 'p-001', name: 'Aurora Desk Lamp', sku: 'ELEC-1001', category: 'Electronics', price: 68, quantity: 42, minLevel: 10, createdAt: '2025-06-12' },
  { id: 'p-002', name: 'Vertex Wireless Mouse', sku: 'ACC-2001', category: 'Accessories', price: 29.5, quantity: 8, minLevel: 10, createdAt: '2025-07-04' },
  { id: 'p-003', name: 'Nimbus Mechanical Keyboard', sku: 'ACC-2002', category: 'Accessories', price: 89, quantity: 0, minLevel: 8, createdAt: '2025-07-22' },
  { id: 'p-004', name: 'Solstice 27" Monitor', sku: 'ELEC-1002', category: 'Electronics', price: 319, quantity: 23, minLevel: 6, createdAt: '2025-08-08' },
  { id: 'p-005', name: 'Orbit USB-C Hub', sku: 'ACC-2003', category: 'Accessories', price: 54, quantity: 15, minLevel: 12, createdAt: '2025-08-30' },
  { id: 'p-006', name: 'Timber Standing Desk', sku: 'FURN-3001', category: 'Furniture', price: 549, quantity: 7, minLevel: 5, createdAt: '2025-09-15' },
  { id: 'p-007', name: 'Halo Ergonomic Chair', sku: 'FURN-3002', category: 'Furniture', price: 279, quantity: 12, minLevel: 8, createdAt: '2025-10-02' },
  { id: 'p-008', name: 'Vault Filing Cabinet', sku: 'STOR-4001', category: 'Storage', price: 199, quantity: 4, minLevel: 6, createdAt: '2025-10-19' },
  { id: 'p-009', name: 'Pinnacle Notebook Set', sku: 'OFF-5001', category: 'Office', price: 18.5, quantity: 120, minLevel: 30, createdAt: '2025-11-06' },
  { id: 'p-010', name: 'Flux Gel Pens (12)', sku: 'OFF-5002', category: 'Office', price: 9.75, quantity: 210, minLevel: 40, createdAt: '2025-11-21' },
  { id: 'p-011', name: 'Nexus Laptop Sleeve', sku: 'ACC-2004', category: 'Accessories', price: 39, quantity: 26, minLevel: 10, createdAt: '2025-12-08' },
  { id: 'p-012', name: 'Prism HD Webcam', sku: 'ELEC-1003', category: 'Electronics', price: 74, quantity: 18, minLevel: 8, createdAt: '2025-12-27' },
  { id: 'p-013', name: 'Echo Conference Speaker', sku: 'ELEC-1004', category: 'Electronics', price: 129, quantity: 0, minLevel: 5, createdAt: '2026-01-15' },
  { id: 'p-014', name: 'Atlas Storage Bin', sku: 'STOR-4002', category: 'Storage', price: 24, quantity: 64, minLevel: 20, createdAt: '2026-02-03' },
  { id: 'p-015', name: 'Summit Whiteboard', sku: 'OFF-5003', category: 'Office', price: 145, quantity: 9, minLevel: 4, createdAt: '2026-02-24' },
  { id: 'p-016', name: 'Drift Ergonomic Footrest', sku: 'FURN-3003', category: 'Furniture', price: 59, quantity: 3, minLevel: 6, createdAt: '2026-03-12' },
  { id: 'p-017', name: 'Photon Power Bank', sku: 'ELEC-1005', category: 'Electronics', price: 42, quantity: 55, minLevel: 15, createdAt: '2026-04-01' },
  { id: 'p-018', name: 'Anchor Cable Organizer', sku: 'ACC-2005', category: 'Accessories', price: 14, quantity: 31, minLevel: 12, createdAt: '2026-04-22' },
  { id: 'p-019', name: 'Cedar Desk Organizer', sku: 'OFF-5004', category: 'Office', price: 32, quantity: 6, minLevel: 8, createdAt: '2026-05-14' },
  { id: 'p-020', name: 'Meridian Monitor Arm', sku: 'FURN-3004', category: 'Furniture', price: 115, quantity: 14, minLevel: 6, createdAt: '2026-06-02' },
  { id: 'p-021', name: 'Bunker Archive Box', sku: 'STOR-4003', category: 'Storage', price: 11, quantity: 88, minLevel: 25, createdAt: '2026-07-19' },
  { id: 'p-022', name: 'Lumina LED Strip', sku: 'ELEC-1006', category: 'Electronics', price: 27, quantity: 19, minLevel: 10, createdAt: '2026-09-05' },
];

export function productStatus(product) {
  const quantity = Number(product.quantity) || 0;
  const minLevel = Number(product.minLevel) || 0;
  if (quantity <= 0) return 'Out of Stock';
  if (quantity <= minLevel) return 'Low Stock';
  return 'In Stock';
}

export function findProductById(id) {
  return products.find((product) => product.id === id) || null;
}

export function productsWithStatus() {
  return products.map((product) => ({ ...product, status: productStatus(product) }));
}
