// generate-dummy-ecommerce.mjs
// Generates a synthetic e-commerce transaction CSV for use in the end‑to‑end workflow.
// The CSV schema matches the real data used by the platform:
//   order_id,order_date,customer_id,category,product,quantity,unit_price,total_price
// Dates span the last 2 years, categories are typical e‑commerce segments.

import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.join(import.meta.dir, '../../dummy-data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'ecommerce_high_quality.csv');

// Ensure output directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const categories = [
  'Electronics', 'Fashion', 'Home & Kitchen', 'Sports', 'Books', 'Beauty', 'Toys'
];
const productsByCategory = {
  Electronics: ['Smartphone', 'Laptop', 'Headphones', 'Camera'],
  Fashion: ['T‑Shirt', 'Jeans', 'Sneakers', 'Jacket'],
  'Home & Kitchen': ['Blender', 'Cookware Set', 'Vacuum Cleaner', 'LED Lamp'],
  Sports: ['Yoga Mat', 'Dumbbells', 'Bicycle', 'Running Shoes'],
  Books: ['Novel', 'Cookbook', 'Science Textbook', 'Children Story'],
  Beauty: ['Lipstick', 'Moisturizer', 'Perfume', 'Hair Dryer'],
  Toys: ['Building Blocks', 'Action Figure', 'Puzzle', 'Board Game']
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start, end) {
  const ts = randInt(start.getTime(), end.getTime());
  const d = new Date(ts);
  return d.toISOString().split('T')[0]; // YYYY‑MM‑DD
}

const startDate = new Date();
startDate.setFullYear(startDate.getFullYear() - 2);
const endDate = new Date();

const RECORD_COUNT = 5000; // modest size, quick to generate

let rows = [];
rows.push('order_id,order_date,customer_id,category,product,quantity,unit_price,total_price');

for (let i = 1; i <= RECORD_COUNT; i++) {
  const orderId = `ORD${String(i).padStart(6, '0')}`;
  const orderDate = randomDate(startDate, endDate);
  const customerId = `CUST${randInt(1, 2000).toString().padStart(5, '0')}`;
  const category = categories[randInt(0, categories.length - 1)];
  const productList = productsByCategory[category];
  const product = productList[randInt(0, productList.length - 1)];
  const quantity = randInt(1, 5);
  const unitPrice = parseFloat((randInt(500, 20000) / 100).toFixed(2)); // $5.00‑$200.00
  const totalPrice = parseFloat((unitPrice * quantity).toFixed(2));
  rows.push(`${orderId},${orderDate},${customerId},${category},${product},${quantity},${unitPrice},${totalPrice}`);
}

fs.writeFileSync(OUTPUT_FILE, rows.join('\n'));
console.log(`✅ Synthetic e‑commerce dataset written to ${OUTPUT_FILE} (${RECORD_COUNT} rows)`);
