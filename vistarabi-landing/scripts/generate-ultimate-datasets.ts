
import fs from 'fs';
import path from 'path';

const RECORD_COUNT = 10000;
const BASE_DIR = path.join(process.cwd(), 'dummy-data/ultimate');

if (!fs.existsSync(BASE_DIR)) fs.mkdirSync(BASE_DIR, { recursive: true });

function getRandomItem(arr: any[]) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDate(start: Date, end: Date) {
    const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    // Inconsistent date formats for dirty testing
    const dice = Math.random();
    if (dice < 0.05) return d.getTime().toString(); // Epoch
    if (dice < 0.1) return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`; // MM/DD/YYYY
    return d.toISOString().split('T')[0]; // ISO
}

function injectDirty(val: any, prob = 0.05) {
    if (Math.random() > prob) return val;
    const dice = Math.random();
    if (dice < 0.3) return ''; // Empty
    if (dice < 0.5) return 'NULL';
    if (typeof val === 'string' && val.length > 0) return `  ${val.toLowerCase()}  `; // Padding + Case
    return val;
}

// ─── ECOMMERCE GENERATOR ───────────────────────────────────────────────────

function generateEcommerce(fileIndex: number) {
    const columns = [
        'order_id', 'customer_id', 'session_id', 'cart_id', 'order_date',
        'revenue', 'cogs', 'marketing_cost', 'category', 'quantity',
        'status', 'channel', 'region', 'product_id', 'sku',
        'unit_price', 'shipping_cost', 'tax', 'customer_type', 'payment_method'
    ];

    const rows = [columns.join(',')];
    const categories = ['Electronics', 'Home', 'Fashion', 'Beauty', 'Sports'];
    const statuses = ['Completed', 'Pending', 'Shipped', 'Cancelled', 'Returned'];
    const channels = ['Web', 'Mobile App', 'Affiliate', 'Social Media'];
    const regions = ['North', 'South', 'East', 'West', 'International'];

    for (let i = 1; i <= RECORD_COUNT; i++) {
        const id = fileIndex * 10000 + i;
        const rev = Math.random() * 500 + 10;
        const qty = Math.floor(Math.random() * 5) + 1;
        const cost = rev * (0.3 + Math.random() * 0.3);
        
        const row = [
            `ORD-${id}`,
            `CUST-${Math.floor(id / 2.5) + 1}`,
            `SESS-${id + 5000}`,
            `CART-${id + 2000}`,
            getRandomDate(new Date(2023, 0, 1), new Date()),
            injectDirty(rev.toFixed(2)),
            cost.toFixed(2),
            (Math.random() * 50).toFixed(2),
            injectDirty(getRandomItem(categories)),
            injectDirty(qty),
            getRandomItem(statuses),
            getRandomItem(channels),
            getRandomItem(regions),
            `P-${Math.floor(Math.random() * 1000) + 1}`,
            `SKU-${Math.floor(Math.random() * 5000) + 1}`,
            (rev / qty).toFixed(2),
            (Math.random() * 20).toFixed(2),
            (rev * 0.08).toFixed(2),
            getRandomItem(['New', 'Returning', 'VIP']),
            getRandomItem(['Credit Card', 'PayPal', 'Crypto', 'Debit Card'])
        ];
        rows.push(row.map(v => v === null ? '' : String(v).replace(/,/g, '')).join(','));
    }

    const fileName = `ecommerce_part_${fileIndex}.csv`;
    fs.writeFileSync(path.join(BASE_DIR, fileName), rows.join('\n'));
    console.log(`✅ Generated ${fileName}`);
}

// ─── RETAIL GENERATOR ───────────────────────────────────────────────────────

function generateRetail(fileIndex: number) {
    const columns = [
        'transaction_id', 'store_id', 'product_id', 'timestamp', 'sales_value',
        'cogs', 'inventory_level', 'quantity_sold', 'received_units', 'items_in_basket',
        'shrinkage', 'visitor_count', 'department', 'store_location', 'brand',
        'stock_status', 'loyalty_id', 'payment_type', 'weather_context', 'is_weekend'
    ];

    const rows = [columns.join(',')];
    const departments = ['Grocery', 'Produce', 'Dairy', 'Bakery', 'Meat', 'Deli'];
    const locations = ['New York', 'London', 'Tokyo', 'Paris', 'Berlin'];
    const brands = ['Private Label', 'National Brand', 'Premium Brand'];

    for (let i = 1; i <= RECORD_COUNT; i++) {
        const id = fileIndex * 10000 + i;
        const sales = Math.random() * 150 + 2;
        const qty = Math.floor(Math.random() * 10) + 1;
        const cost = sales * (0.5 + Math.random() * 0.2);
        
        const row = [
            `TXN-${id}`,
            `STORE-${(id % 15) + 1}`,
            `P-${Math.floor(Math.random() * 500) + 1}`,
            getRandomDate(new Date(2024, 0, 1), new Date()),
            injectDirty(sales.toFixed(2)),
            cost.toFixed(2),
            Math.floor(Math.random() * 1000),
            injectDirty(qty),
            (qty + Math.floor(Math.random() * 5)).toString(),
            Math.floor(Math.random() * 15) + 1,
            (Math.random() < 0.05 ? Math.random() * 10 : 0).toFixed(2),
            Math.floor(Math.random() * 50) + 10,
            injectDirty(getRandomItem(departments)),
            getRandomItem(locations),
            getRandomItem(brands),
            getRandomItem(['In Stock', 'Low Stock', 'Out of Stock']),
            Math.random() < 0.4 ? `L-${1000 + id}` : '',
            getRandomItem(['Cash', 'Card', 'Mobile Pay']),
            getRandomItem(['Sunny', 'Rainy', 'Cloudy', 'Snowy']),
            Math.random() < 0.3 ? 'TRUE' : 'FALSE'
        ];
        rows.push(row.map(v => v === null ? '' : String(v).replace(/,/g, '')).join(','));
    }

    const fileName = `retail_part_${fileIndex}.csv`;
    fs.writeFileSync(path.join(BASE_DIR, fileName), rows.join('\n'));
    console.log(`✅ Generated ${fileName}`);
}

for (let i = 1; i <= 3; i++) {
    generateEcommerce(i);
    generateRetail(i);
}
