// Test Dataset Generator for Module 4D
// Creates realistic e-commerce multi-table test data

// =================================================
// Type Definitions
// =================================================

export interface TestSource {
    id: string;
    fileName: string;
    columns: string[];
    data: Record<string, unknown>[];
    status: 'READY';
}

export interface TestKPI {
    kpiId: string;
    kpiName: string;
    formula: string;
    category: string;
    matchedColumns: string[];
    expectedSources: string[];
    expectedJoins: number;
}

export interface ExpectedRelationship {
    source: string;
    target: string;
    sourceCol: string;
    targetCol: string;
}

// =================================================
// Test Data: Customers
// =================================================

export const customers = [
    { customer_id: 'C001', name: 'Alice Johnson', email: 'alice@example.com', city: 'New York' },
    { customer_id: 'C002', name: 'Bob Smith', email: 'bob@example.com', city: 'Los Angeles' },
    { customer_id: 'C003', name: 'Carol Williams', email: 'carol@example.com', city: 'Chicago' },
    { customer_id: 'C004', name: 'David Brown', email: 'david@example.com', city: 'Houston' },
    { customer_id: 'C005', name: 'Eve Davis', email: 'eve@example.com', city: 'Phoenix' },
];

// =================================================
// Test Data: Products
// =================================================

export const products = [
    { product_id: 'P001', name: 'Laptop', price: 999.99, category: 'Electronics' },
    { product_id: 'P002', name: 'Smartphone', price: 699.99, category: 'Electronics' },
    { product_id: 'P003', name: 'Headphones', price: 149.99, category: 'Electronics' },
    { product_id: 'P004', name: 'Desk Chair', price: 299.99, category: 'Furniture' },
    { product_id: 'P005', name: 'Monitor', price: 449.99, category: 'Electronics' },
];

// =================================================
// Test Data: Orders
// =================================================

export const orders = [
    { order_id: 'O001', customer_id: 'C001', order_date: '2024-01-15', total_amount: 1149.98 },
    { order_id: 'O002', customer_id: 'C002', order_date: '2024-01-16', total_amount: 699.99 },
    { order_id: 'O003', customer_id: 'C001', order_date: '2024-01-17', total_amount: 449.99 },
    { order_id: 'O004', customer_id: 'C003', order_date: '2024-01-18', total_amount: 149.99 },
    { order_id: 'O005', customer_id: 'C004', order_date: '2024-01-19', total_amount: 1699.97 },
    { order_id: 'O006', customer_id: 'C002', order_date: '2024-01-20', total_amount: 299.99 },
];

// =================================================
// Test Data: Order Items
// =================================================

export const orderItems = [
    { item_id: 'I001', order_id: 'O001', product_id: 'P001', quantity: 1 },
    { item_id: 'I002', order_id: 'O001', product_id: 'P003', quantity: 1 },
    { item_id: 'I003', order_id: 'O002', product_id: 'P002', quantity: 1 },
    { item_id: 'I004', order_id: 'O003', product_id: 'P005', quantity: 1 },
    { item_id: 'I005', order_id: 'O004', product_id: 'P003', quantity: 1 },
    { item_id: 'I006', order_id: 'O005', product_id: 'P001', quantity: 1 },
    { item_id: 'I007', order_id: 'O005', product_id: 'P002', quantity: 1 },
    { item_id: 'I008', order_id: 'O006', product_id: 'P004', quantity: 1 },
];

// =================================================
// Edge Case Data
// =================================================

// Misleading column names (similar names but no value overlap)
export const misleadingData = [
    { id: 'M001', customer_id: 'FAKE001', status: 'active' },
    { id: 'M002', customer_id: 'FAKE002', status: 'inactive' },
    { id: 'M003', customer_id: 'FAKE003', status: 'pending' },
];

// Partial overlap (some values match but not all)
export const partialOverlapData = [
    { ref_id: 'C001', amount: 100 },
    { ref_id: 'C002', amount: 200 },
    { ref_id: 'X999', amount: 300 },
    { ref_id: 'Y888', amount: 400 },
];

// =================================================
// Source Generators
// =================================================

export function createTestSources(): TestSource[] {
    return [
        {
            id: 'src-customers',
            fileName: 'customers.csv',
            columns: ['customer_id', 'name', 'email', 'city'],
            data: customers,
            status: 'READY',
        },
        {
            id: 'src-orders',
            fileName: 'orders.csv',
            columns: ['order_id', 'customer_id', 'order_date', 'total_amount'],
            data: orders,
            status: 'READY',
        },
        {
            id: 'src-products',
            fileName: 'products.csv',
            columns: ['product_id', 'name', 'price', 'category'],
            data: products,
            status: 'READY',
        },
        {
            id: 'src-order-items',
            fileName: 'order_items.csv',
            columns: ['item_id', 'order_id', 'product_id', 'quantity'],
            data: orderItems,
            status: 'READY',
        },
    ];
}

export function createEdgeCaseSources(): TestSource[] {
    return [
        ...createTestSources(),
        {
            id: 'src-misleading',
            fileName: 'misleading.csv',
            columns: ['id', 'customer_id', 'status'],
            data: misleadingData,
            status: 'READY',
        },
        {
            id: 'src-partial',
            fileName: 'partial_overlap.csv',
            columns: ['ref_id', 'amount'],
            data: partialOverlapData,
            status: 'READY',
        },
    ];
}

// =================================================
// Expected Relationships
// =================================================

export const expectedRelationships: ExpectedRelationship[] = [
    { source: 'orders.csv', target: 'customers.csv', sourceCol: 'customer_id', targetCol: 'customer_id' },
    { source: 'order_items.csv', target: 'orders.csv', sourceCol: 'order_id', targetCol: 'order_id' },
    { source: 'order_items.csv', target: 'products.csv', sourceCol: 'product_id', targetCol: 'product_id' },
];

// =================================================
// Test KPIs
// =================================================

export const testKPIs: TestKPI[] = [
    {
        kpiId: 'kpi-total-revenue',
        kpiName: 'Total Revenue',
        formula: 'SUM(total_amount)',
        category: 'Financial',
        matchedColumns: ['total_amount'],
        expectedSources: ['orders.csv'],
        expectedJoins: 0,
    },
    {
        kpiId: 'kpi-order-count',
        kpiName: 'Order Count',
        formula: 'COUNT(order_id)',
        category: 'Operational',
        matchedColumns: ['order_id'],
        expectedSources: ['orders.csv'],
        expectedJoins: 0,
    },
    {
        kpiId: 'kpi-revenue-per-customer',
        kpiName: 'Revenue per Customer',
        formula: 'SUM(total_amount) / COUNT(DISTINCT customer_id)',
        category: 'Financial',
        matchedColumns: ['total_amount', 'customer_id'],
        expectedSources: ['orders.csv', 'customers.csv'],
        expectedJoins: 1,
    },
    {
        kpiId: 'kpi-avg-order-value',
        kpiName: 'Average Order Value',
        formula: 'AVG(total_amount)',
        category: 'Financial',
        matchedColumns: ['total_amount'],
        expectedSources: ['orders.csv'],
        expectedJoins: 0,
    },
];
