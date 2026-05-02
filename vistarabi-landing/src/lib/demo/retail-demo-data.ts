// Sample retail demo dataset for VistaraBI
// This data represents a fictional retail chain with multiple stores

export interface RetailStore {
  store_id: string;
  store_name: string;
  city: string;
  square_feet: number;
  opening_date: string;
}

export interface RetailSales {
  sale_id: string;
  store_id: string;
  date: string;
  amount: number;
  cost: number;
  quantity_items: number;
}

export interface RetailInventory {
  inventory_id: string;
  store_id: string;
  product_id: string;
  quantity: number;
  last_updated: string;
}

export interface RetailFootTraffic {
  traffic_id: string;
  store_id: string;
  date: string;
  visitors: number;
}

export interface RetailProduct {
  product_id: string;
  product_name: string;
  category: string;
  cost_per_unit: number;
  selling_price: number;
}

// Store data
export const RETAIL_STORES: RetailStore[] = [
  {
    store_id: 'STORE-001',
    store_name: 'Downtown Plaza',
    city: 'New York',
    square_feet: 5000,
    opening_date: '2020-01-15',
  },
  {
    store_id: 'STORE-002',
    store_name: 'Midtown Mall',
    city: 'New York',
    square_feet: 4500,
    opening_date: '2020-06-01',
  },
  {
    store_id: 'STORE-003',
    store_name: 'Brooklyn Bridge',
    city: 'New York',
    square_feet: 3500,
    opening_date: '2021-03-10',
  },
  {
    store_id: 'STORE-004',
    store_name: 'Times Square',
    city: 'New York',
    square_feet: 6000,
    opening_date: '2021-09-20',
  },
  {
    store_id: 'STORE-005',
    store_name: 'Upper East Side',
    city: 'New York',
    square_feet: 3800,
    opening_date: '2022-01-05',
  },
];

// Product catalog
export const RETAIL_PRODUCTS: RetailProduct[] = [
  {
    product_id: 'PROD-001',
    product_name: 'Winter Jacket',
    category: 'Apparel',
    cost_per_unit: 25,
    selling_price: 79.99,
  },
  {
    product_id: 'PROD-002',
    product_name: 'Jeans',
    category: 'Apparel',
    cost_per_unit: 15,
    selling_price: 49.99,
  },
  {
    product_id: 'PROD-003',
    product_name: 'T-Shirt',
    category: 'Apparel',
    cost_per_unit: 5,
    selling_price: 19.99,
  },
  {
    product_id: 'PROD-004',
    product_name: 'Running Shoes',
    category: 'Footwear',
    cost_per_unit: 30,
    selling_price: 99.99,
  },
  {
    product_id: 'PROD-005',
    product_name: 'Baseball Cap',
    category: 'Accessories',
    cost_per_unit: 5,
    selling_price: 24.99,
  },
];

// Generate sales data for last 90 days
export function generateRetailSalesData(): RetailSales[] {
  const sales: RetailSales[] = [];
  const today = new Date();
  
  for (let daysBack = 89; daysBack >= 0; daysBack--) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysBack);
    const dateStr = date.toISOString().split('T')[0];

    // Generate 3-8 sales per store per day
    for (const store of RETAIL_STORES) {
      const numSales = Math.floor(Math.random() * 6) + 3;
      
      for (let i = 0; i < numSales; i++) {
        const product = RETAIL_PRODUCTS[Math.floor(Math.random() * RETAIL_PRODUCTS.length)];
        const quantity = Math.floor(Math.random() * 5) + 1;
        const amount = product.selling_price * quantity;
        const cost = product.cost_per_unit * quantity;

        sales.push({
          sale_id: `SALE-${dateStr}-${store.store_id}-${i}`,
          store_id: store.store_id,
          date: dateStr,
          amount,
          cost,
          quantity_items: quantity,
        });
      }
    }
  }

  return sales;
}

// Generate inventory data
export function generateRetailInventoryData(): RetailInventory[] {
  const inventory: RetailInventory[] = [];
  
  for (const store of RETAIL_STORES) {
    for (const product of RETAIL_PRODUCTS) {
      inventory.push({
        inventory_id: `INV-${store.store_id}-${product.product_id}`,
        store_id: store.store_id,
        product_id: product.product_id,
        quantity: Math.floor(Math.random() * 100) + 10,
        last_updated: new Date().toISOString().split('T')[0],
      });
    }
  }

  return inventory;
}

// Generate foot traffic data for last 90 days
export function generateRetailFootTrafficData(): RetailFootTraffic[] {
  const traffic: RetailFootTraffic[] = [];
  const today = new Date();

  for (let daysBack = 89; daysBack >= 0; daysBack--) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysBack);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();

    for (const store of RETAIL_STORES) {
      // More visitors on weekends
      const baseVisitors = dayOfWeek === 0 || dayOfWeek === 6 ? 400 : 250;
      const variance = Math.floor(Math.random() * 100) - 50;
      const visitors = Math.max(100, baseVisitors + variance);

      traffic.push({
        traffic_id: `TRAFFIC-${dateStr}-${store.store_id}`,
        store_id: store.store_id,
        date: dateStr,
        visitors,
      });
    }
  }

  return traffic;
}

// Calculate retail KPIs
export interface RetailKPIMetrics {
  storeId: string;
  storeName: string;
  salesPerSqft: number;
  inventoryTurnover: number;
  footTraffic: number;
  grossMargin: number;
  totalSales: number;
  totalCost: number;
  averageSaleValue: number;
}

export function calculateRetailKPIs(
  stores: RetailStore[],
  sales: RetailSales[],
  inventory: RetailInventory[],
  traffic: RetailFootTraffic[]
): RetailKPIMetrics[] {
  
  return stores.map(store => {
    // Sales Per Square Foot
    const storeSales = sales.filter(s => s.store_id === store.store_id);
    const totalSales = storeSales.reduce((sum, s) => sum + s.amount, 0);
    const salesPerSqft = totalSales / store.square_feet;

    // Gross Margin
    const totalCost = storeSales.reduce((sum, s) => sum + s.cost, 0);
    const grossMargin = totalSales > 0 ? ((totalSales - totalCost) / totalSales) * 100 : 0;

    // Inventory Turnover (COGS / Average Inventory Value)
    const storeInventory = inventory.filter(i => i.store_id === store.store_id);
    const averageInventoryValue = storeInventory.reduce((sum, i) => {
      const product = RETAIL_PRODUCTS.find(p => p.product_id === i.product_id);
      return sum + (product?.cost_per_unit || 0) * i.quantity;
    }, 0) / Math.max(1, storeInventory.length);
    const inventoryTurnover = averageInventoryValue > 0 ? totalCost / averageInventoryValue : 0;

    // Foot Traffic (last 90 days)
    const storeTraffic = traffic.filter(t => t.store_id === store.store_id);
    const footTraffic = storeTraffic.reduce((sum, t) => sum + t.visitors, 0);

    // Average Sale Value
    const averageSaleValue = storeSales.length > 0 ? totalSales / storeSales.length : 0;

    return {
      storeId: store.store_id,
      storeName: store.store_name,
      salesPerSqft: Math.round(salesPerSqft * 100) / 100,
      inventoryTurnover: Math.round(inventoryTurnover * 100) / 100,
      footTraffic,
      grossMargin: Math.round(grossMargin * 100) / 100,
      totalSales: Math.round(totalSales * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      averageSaleValue: Math.round(averageSaleValue * 100) / 100,
    };
  });
}

// Export aggregated metrics
export function getRetailDemoSummary() {
  const stores = RETAIL_STORES;
  const sales = generateRetailSalesData();
  const inventory = generateRetailInventoryData();
  const traffic = generateRetailFootTrafficData();
  
  const kpis = calculateRetailKPIs(stores, sales, inventory, traffic);

  // Calculate chain-wide metrics
  const chainMetrics = {
    totalStores: stores.length,
    chainwideSalesPerSqft: Math.round((kpis.reduce((sum, k) => sum + k.salesPerSqft, 0) / kpis.length) * 100) / 100,
    chainwideInventoryTurnover: Math.round((kpis.reduce((sum, k) => sum + k.inventoryTurnover, 0) / kpis.length) * 100) / 100,
    totalFootTraffic: kpis.reduce((sum, k) => sum + k.footTraffic, 0),
    chainwideGrossMargin: Math.round((kpis.reduce((sum, k) => sum + k.grossMargin, 0) / kpis.length) * 100) / 100,
    totalRevenue: Math.round(kpis.reduce((sum, k) => sum + k.totalSales, 0) * 100) / 100,
  };

  return {
    stores,
    sales,
    inventory,
    traffic,
    storeMetrics: kpis,
    chainMetrics,
  };
}
