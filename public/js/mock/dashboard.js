import { users } from './users.js';
import { products, productCategories, productStatus } from './products.js';
import { sales } from './sales.js';
import { stockTransactions } from './stock.js';
import { purchaseOrders, suppliers } from './purchases.js';
import { orders } from './orders.js';
import { notifications } from './notifications.js';
import { activity } from './activity.js';
import { parseDate, sum, timeAgo } from '../utils.js';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthBuckets(count = 6) {
  const now = new Date();
  const buckets = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    buckets.push({
      label: MONTH_LABELS[start.getMonth()],
      start,
      end,
    });
  }
  return buckets;
}

function lastNDates(n) {
  const dates = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    dates.push(date);
  }
  return dates;
}

function dayBuckets(n) {
  return lastNDates(n).map((date) => ({
    label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    start: date,
    end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999),
  }));
}

function weekBuckets(nDays) {
  const weeks = Math.ceil(nDays / 7);
  const buckets = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const end = new Date(today);
    end.setDate(today.getDate() - i * 7);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    buckets.push({
      label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      start,
      end,
    });
  }
  return buckets;
}

function rangeBuckets(days) {
  return days > 45 ? weekBuckets(days) : dayBuckets(days);
}

function inRange(value, bucket) {
  const date = parseDate(value);
  if (!date) return false;
  return date.getTime() >= bucket.start.getTime() && date.getTime() <= bucket.end.getTime();
}

function groupSum(items, dateKey, valueSelector, buckets) {
  return buckets.map((bucket) =>
    sum(items.filter((item) => inRange(item[dateKey], bucket)), valueSelector),
  );
}

function groupCount(items, dateKey, buckets) {
  return buckets.map((bucket) => items.filter((item) => inRange(item[dateKey], bucket)).length);
}

function statusCounts(items, key) {
  return items.reduce((acc, item) => {
    acc[item[key]] = (acc[item[key]] || 0) + 1;
    return acc;
  }, {});
}

function productAlerts(limit = 4) {
  return products
    .filter((product) => product.quantity <= product.minLevel)
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, limit)
    .map((product) => ({
      id: product.id,
      title: product.name,
      message:
        product.quantity <= 0
          ? 'Out of stock — reorder immediately.'
          : `${product.quantity} units left · minimum ${product.minLevel}.`,
      tone: product.quantity <= 0 ? 'danger' : 'warning',
      icon: product.quantity <= 0 ? 'xCircle' : 'alertTriangle',
    }));
}

function notificationAlerts(roleKey, limit = 4) {
  const roleTypes = {
    owner: ['low_stock', 'expiry', 'order'],
    product: ['low_stock', 'expiry'],
    sales: ['order'],
    stock: ['low_stock', 'expiry'],
    purchase: ['order', 'low_stock'],
    orders: ['order'],
  };
  const allowed = roleTypes[roleKey] || [];
  const icons = { low_stock: 'alertTriangle', expiry: 'calendar', order: 'orders' };
  const tones = { low_stock: 'warning', expiry: 'danger', order: 'info' };
  return notifications
    .filter((notification) => allowed.includes(notification.type) && !notification.read)
    .slice(0, limit)
    .map((notification) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      tone: tones[notification.type] || 'info',
      icon: icons[notification.type] || 'info',
    }));
}

function moduleActivity(moduleNames, limit = 6) {
  const list = Array.isArray(moduleNames) ? moduleNames : [moduleNames];
  return activity
    .filter((item) => list.includes(item.module))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      title: item.action,
      meta: `${item.module} · ${item.userName}`,
      time: timeAgo(item.timestamp),
      icon: item.module === 'Authentication' ? 'lock' : 'activity',
      tone: item.module === 'Authentication' ? 'info' : 'accent',
    }));
}

function stockByCategory() {
  return productCategories.map((category) =>
    sum(products.filter((product) => product.category === category), (product) => product.quantity),
  );
}

function productStats() {
  const withStatus = products.map((product) => ({ ...product, status: productStatus(product) }));
  return {
    total: withStatus.length,
    categories: new Set(withStatus.map((product) => product.category)).size,
    outOfStock: withStatus.filter((product) => product.status === 'Out of Stock').length,
    lowStock: withStatus.filter((product) => product.status === 'Low Stock').length,
    alerts: withStatus.filter((product) => product.status !== 'In Stock').length,
  };
}

function topProductsThisMonth() {
  const now = new Date();
  const unitsByProduct = {};
  stockTransactions
    .filter((transaction) => transaction.type === 'out')
    .filter((transaction) => {
      const date = parseDate(transaction.date);
      return date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .forEach((transaction) => {
      unitsByProduct[transaction.productName] = (unitsByProduct[transaction.productName] || 0) + transaction.quantity;
    });
  return Object.entries(unitsByProduct)
    .map(([name, units]) => ({ name, units }))
    .sort((a, b) => b.units - a.units);
}

function orderStatusSeries() {
  const counts = statusCounts(orders, 'status');
  const labels = ['New', 'Processing', 'Completed', 'Cancelled'];
  return { labels, data: labels.map((label) => counts[label] || 0) };
}

function purchaseStatusSeries() {
  const counts = statusCounts(purchaseOrders, 'status');
  const labels = ['Pending', 'Partially Received', 'Received'];
  return { labels, data: labels.map((label) => counts[label] || 0) };
}

export function getDashboard(roleKey) {
  const months = monthBuckets(6);
  const days7 = dayBuckets(7);
  const now = new Date();
  const productSummary = productStats();

  if (roleKey === 'owner') {
    const revenue = groupSum(sales, 'date', (sale) => sale.total, months);
    return {
      kpis: {
        totalUsers: { value: users.length },
        activeUsers: { value: users.filter((user) => user.status === 'active').length },
        totalProducts: { value: products.length },
        lowStockItems: { value: productSummary.alerts },
      },
      charts: {
        trend: {
          title: 'Revenue trend',
          subtitle: 'Total sales value over the last six months',
          type: 'line',
          format: 'currency',
          labels: months.map((bucket) => bucket.label),
          series: [{ label: 'Revenue', data: revenue, tone: 'accent', fill: true }],
        },
        breakdown: {
          title: 'Stock by category',
          subtitle: 'Units currently on hand',
          type: 'bar',
          format: 'number',
          labels: productCategories,
          data: stockByCategory(),
          tones: ['accent', 'info', 'success', 'warning', 'danger'],
        },
      },
      recentActivity: moduleActivity(['User Management', 'Authentication', 'Dashboard', 'Reports'], 6),
      alerts: productAlerts(5),
    };
  }

  if (roleKey === 'product') {
    const counts = productCategories.map(
      (category) => products.filter((product) => product.category === category).length,
    );
    const added = groupCount(products, 'createdAt', months);
    return {
      kpis: {
        totalProducts: { value: productSummary.total },
        categories: { value: productSummary.categories },
        outOfStock: { value: productSummary.outOfStock },
        lowStock: { value: productSummary.lowStock },
      },
      charts: {
        trend: {
          title: 'Catalogue growth',
          subtitle: 'Products added over the last six months',
          type: 'bar',
          format: 'number',
          labels: months.map((bucket) => bucket.label),
          series: [{ label: 'New products', data: added, tone: 'accent' }],
        },
        breakdown: {
          title: 'Products by category',
          subtitle: 'Distribution across the catalogue',
          type: 'doughnut',
          format: 'number',
          labels: productCategories,
          data: counts,
          tones: ['accent', 'info', 'success', 'warning', 'danger'],
        },
      },
      recentActivity: moduleActivity(['Products', 'Reports'], 6),
      alerts: productAlerts(5),
    };
  }

  if (roleKey === 'sales') {
    const todayTotal = sum(
      sales.filter((sale) => {
        const date = parseDate(sale.date);
        return date && date.toDateString() === new Date().toDateString();
      }),
      (sale) => sale.total,
    );
    const monthTotal = sum(
      sales.filter((sale) => {
        const date = parseDate(sale.date);
        return date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }),
      (sale) => sale.total,
    );
    const revenue = groupSum(sales, 'date', (sale) => sale.total, days7);
    const top = topProductsThisMonth();
    const topFive = top.slice(0, 5);
    return {
      kpis: {
        todaySales: { value: todayTotal },
        monthlySales: { value: monthTotal },
        completedSales: { value: sales.length },
        topProducts: {
          value: topFive[0]?.name || 'No sales yet',
          note: topFive[0] ? `${topFive[0].units} units sold this month` : 'Awaiting first sale',
        },
      },
      charts: {
        trend: {
          title: 'Revenue',
          subtitle: 'Daily sales value over the last seven days',
          type: 'line',
          format: 'currency',
          labels: days7.map((bucket) => bucket.label),
          series: [{ label: 'Revenue', data: revenue, tone: 'accent', fill: true }],
        },
        breakdown: {
          title: 'Top products',
          subtitle: 'Units moved this month',
          type: 'bar',
          horizontal: true,
          format: 'number',
          labels: topFive.map((item) => item.name),
          data: topFive.map((item) => item.units),
          tones: ['accent'],
        },
      },
      recentActivity: moduleActivity(['Sales', 'Reports', 'Authentication'], 6),
      alerts: notificationAlerts('sales', 5),
    };
  }

  if (roleKey === 'stock') {
    const monthTransactions = stockTransactions.filter((transaction) => {
      const date = parseDate(transaction.date);
      return date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    const stockIn = sum(monthTransactions.filter((t) => t.type === 'in'), (t) => t.quantity);
    const stockOut = sum(monthTransactions.filter((t) => t.type === 'out'), (t) => t.quantity);
    const adjustments = monthTransactions.filter((t) => t.type === 'adjustment').length;
    const typeCounts = statusCounts(stockTransactions, 'type');
    return {
      kpis: {
        stockIn: { value: stockIn },
        stockOut: { value: stockOut },
        adjustments: { value: adjustments },
        stockAlerts: {
          value: productSummary.alerts,
          note: `${productSummary.lowStock} low stock · ${productSummary.outOfStock} out of stock`,
        },
      },
      charts: {
        trend: {
          title: 'Warehouse movement',
          subtitle: 'Units received and issued over the last seven days',
          type: 'line',
          format: 'number',
          labels: days7.map((bucket) => bucket.label),
          series: [
            {
              label: 'Stock in',
              data: groupSum(stockTransactions.filter((t) => t.type === 'in'), 'date', (t) => t.quantity, days7),
              tone: 'success',
              fill: true,
            },
            {
              label: 'Stock out',
              data: groupSum(stockTransactions.filter((t) => t.type === 'out'), 'date', (t) => t.quantity, days7),
              tone: 'warning',
              fill: true,
            },
          ],
        },
        breakdown: {
          title: 'Movement types',
          subtitle: 'All recorded stock transactions',
          type: 'doughnut',
          format: 'number',
          labels: ['Stock in', 'Stock out', 'Adjustments'],
          data: [typeCounts.in || 0, typeCounts.out || 0, typeCounts.adjustment || 0],
          tones: ['success', 'warning', 'info'],
        },
      },
      recentActivity: moduleActivity(['Stock', 'Reports', 'Authentication'], 6),
      alerts: productAlerts(5),
    };
  }

  if (roleKey === 'purchase') {
    const open = purchaseOrders.filter((order) => order.status !== 'Received');
    const monthValue = sum(
      purchaseOrders.filter((order) => {
        const date = parseDate(order.date);
        return date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }),
      (order) => order.total,
    );
    const statusSeries = purchaseStatusSeries();
    return {
      kpis: {
        openOrders: { value: open.length },
        pendingReceipts: {
          value: open.length,
          note: `${sum(open, (order) => order.qtyOrdered - order.qtyReceived)} units still due`,
        },
        suppliers: { value: suppliers.length },
        monthlyValue: { value: monthValue },
      },
      charts: {
        trend: {
          title: 'Purchase value',
          subtitle: 'Monthly spend over the last six months',
          type: 'bar',
          format: 'currency',
          labels: months.map((bucket) => bucket.label),
          series: [
            {
              label: 'Purchase value',
              data: groupSum(purchaseOrders, 'date', (order) => order.total, months),
              tone: 'accent',
            },
          ],
        },
        breakdown: {
          title: 'Order status',
          subtitle: 'Where purchase orders currently stand',
          type: 'doughnut',
          format: 'number',
          labels: statusSeries.labels,
          data: statusSeries.data,
          tones: ['warning', 'info', 'success'],
        },
      },
      recentActivity: moduleActivity(['Purchase', 'Reports', 'Authentication'], 6),
      alerts: [
        ...notificationAlerts('purchase', 3),
        ...productAlerts(2),
      ].slice(0, 5),
    };
  }

  const statusSeries = orderStatusSeries();
  const statusCount = statusCounts(orders, 'status');
  return {
    kpis: {
      newOrders: { value: statusCount.New || 0 },
      processing: { value: statusCount.Processing || 0 },
      completed: { value: statusCount.Completed || 0 },
      cancelled: { value: statusCount.Cancelled || 0 },
    },
    charts: {
      trend: {
        title: 'Order volume',
        subtitle: 'Orders received over the last seven days',
        type: 'line',
        format: 'number',
        labels: days7.map((bucket) => bucket.label),
        series: [{ label: 'Orders', data: groupCount(orders, 'date', days7), tone: 'accent', fill: true }],
      },
      breakdown: {
        title: 'Order status',
        subtitle: 'Current pipeline distribution',
        type: 'doughnut',
        format: 'number',
        labels: statusSeries.labels,
        data: statusSeries.data,
        tones: ['accent', 'info', 'success', 'danger'],
      },
    },
    recentActivity: moduleActivity(['Orders', 'Reports', 'Authentication'], 6),
    alerts: notificationAlerts('orders', 5),
  };
}

export function getAnalytics(roleKey, days = 30) {
  const buckets = rangeBuckets(days);
  const labels = buckets.map((bucket) => bucket.label);
  const productSummary = productStats();
  let summary;
  let trend;
  let breakdown;

  if (roleKey === 'owner') {
    const revenue = groupSum(sales, 'date', (sale) => sale.total, buckets);
    summary = [
      { label: 'Revenue', value: sum(revenue, (value) => value), format: 'currency', icon: 'creditCard' },
      { label: 'Orders', value: orders.filter((order) => buckets.some((bucket) => inRange(order.date, bucket))).length, format: 'number', icon: 'orders' },
      { label: 'Stock alerts', value: productSummary.alerts, format: 'number', icon: 'alertTriangle' },
    ];
    trend = { title: 'Revenue trend', format: 'currency', series: [{ label: 'Revenue', data: revenue, tone: 'accent', fill: true }] };
    breakdown = {
      title: 'Users by role',
      type: 'doughnut',
      format: 'number',
      labels: ['Owner', 'Product', 'Sales', 'Stock', 'Purchase', 'Orders'],
      data: ['owner', 'product', 'sales', 'stock', 'purchase', 'orders'].map(
        (role) => users.filter((user) => user.role === role).length,
      ),
      tones: ['accent', 'warning', 'success', 'info', 'danger', 'neutral'],
    };
  } else if (roleKey === 'product') {
    summary = [
      { label: 'Products', value: products.length, format: 'number', icon: 'box' },
      { label: 'Categories', value: productSummary.categories, format: 'number', icon: 'layers' },
      { label: 'Stock alerts', value: productSummary.alerts, format: 'number', icon: 'alertTriangle' },
    ];
    trend = {
      title: 'Products added',
      format: 'number',
      series: [{ label: 'New products', data: groupCount(products, 'createdAt', buckets), tone: 'accent' }],
    };
    breakdown = {
      title: 'Products by category',
      type: 'doughnut',
      format: 'number',
      labels: productCategories,
      data: productCategories.map((category) => products.filter((product) => product.category === category).length),
      tones: ['accent', 'info', 'success', 'warning', 'danger'],
    };
  } else if (roleKey === 'sales') {
    const revenue = groupSum(sales, 'date', (sale) => sale.total, buckets);
    const filteredSales = sales.filter((sale) => buckets.some((bucket) => inRange(sale.date, bucket)));
    summary = [
      { label: 'Revenue', value: sum(revenue, (value) => value), format: 'currency', icon: 'creditCard' },
      { label: 'Sales', value: filteredSales.length, format: 'number', icon: 'sales' },
      {
        label: 'Average sale',
        value: filteredSales.length ? sum(filteredSales, (sale) => sale.total) / filteredSales.length : 0,
        format: 'currency',
        icon: 'trendingUp',
      },
    ];
    trend = {
      title: 'Revenue trend',
      format: 'currency',
      series: [{ label: 'Revenue', data: revenue, tone: 'accent', fill: true }],
    };
    const top = topProductsThisMonth().slice(0, 5);
    breakdown = {
      title: 'Top products',
      type: 'bar',
      horizontal: true,
      format: 'number',
      labels: top.map((item) => item.name),
      data: top.map((item) => item.units),
      tones: ['accent'],
    };
  } else if (roleKey === 'stock') {
    const inSeries = groupSum(stockTransactions.filter((t) => t.type === 'in'), 'date', (t) => t.quantity, buckets);
    const outSeries = groupSum(stockTransactions.filter((t) => t.type === 'out'), 'date', (t) => t.quantity, buckets);
    const filtered = stockTransactions.filter((transaction) => buckets.some((bucket) => inRange(transaction.date, bucket)));
    summary = [
      { label: 'Units received', value: sum(inSeries, (value) => value), format: 'number', icon: 'arrowDownCircle' },
      { label: 'Units issued', value: sum(outSeries, (value) => value), format: 'number', icon: 'arrowUpCircle' },
      { label: 'Transactions', value: filtered.length, format: 'number', icon: 'stock' },
    ];
    trend = {
      title: 'Stock movement',
      format: 'number',
      series: [
        { label: 'Stock in', data: inSeries, tone: 'success', fill: true },
        { label: 'Stock out', data: outSeries, tone: 'warning', fill: true },
      ],
    };
    breakdown = {
      title: 'Movement types',
      type: 'doughnut',
      format: 'number',
      labels: ['Stock in', 'Stock out', 'Adjustments'],
      data: ['in', 'out', 'adjustment'].map(
        (type) => filtered.filter((transaction) => transaction.type === type).length,
      ),
      tones: ['success', 'warning', 'info'],
    };
  } else if (roleKey === 'purchase') {
    const valueSeries = groupSum(purchaseOrders, 'date', (order) => order.total, buckets);
    const filtered = purchaseOrders.filter((order) => buckets.some((bucket) => inRange(order.date, bucket)));
    summary = [
      { label: 'Purchase value', value: sum(filtered, (order) => order.total), format: 'currency', icon: 'creditCard' },
      { label: 'Purchase orders', value: filtered.length, format: 'number', icon: 'purchase' },
      { label: 'Suppliers', value: suppliers.length, format: 'number', icon: 'briefcase' },
    ];
    trend = {
      title: 'Purchase value',
      format: 'currency',
      series: [{ label: 'Purchase value', data: valueSeries, tone: 'accent' }],
    };
    const statusSeries = purchaseStatusSeries();
    breakdown = {
      title: 'Purchase status',
      type: 'doughnut',
      format: 'number',
      labels: statusSeries.labels,
      data: statusSeries.data,
      tones: ['warning', 'info', 'success'],
    };
  } else {
    const filtered = orders.filter((order) => buckets.some((bucket) => inRange(order.date, bucket)));
    summary = [
      { label: 'Orders', value: filtered.length, format: 'number', icon: 'orders' },
      {
        label: 'Completed rate',
        value: filtered.length
          ? (filtered.filter((order) => order.status === 'Completed').length / filtered.length) * 100
          : 0,
        format: 'percent',
        icon: 'checkCircle',
      },
      { label: 'Order value', value: sum(filtered, (order) => order.total), format: 'currency', icon: 'creditCard' },
    ];
    trend = {
      title: 'Order volume',
      format: 'number',
      series: [{ label: 'Orders', data: groupCount(orders, 'date', buckets), tone: 'accent', fill: true }],
    };
    const statusSeries = orderStatusSeries();
    breakdown = {
      title: 'Order status',
      type: 'doughnut',
      format: 'number',
      labels: statusSeries.labels,
      data: statusSeries.data,
      tones: ['accent', 'info', 'success', 'danger'],
    };
  }

  trend.type = 'line';
  trend.labels = labels;
  return { summary, trend, breakdown };
}
