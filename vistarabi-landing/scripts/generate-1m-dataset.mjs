import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '../dummy-data/ultimate');
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const FILE_PATH = path.join(OUTPUT_DIR, 'ecommerce_1m.csv');
const TARGET_ROWS = 1000000;
const BATCH_SIZE = 10000;

const getRandomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split('T')[0];
const statuses = ['Pending', 'Shipped', 'Delivered', 'Cancelled'];
const categories = ['Electronics', 'Home', 'Fashion', 'Sports', 'Toys'];

async function generate() {
    console.log(`Starting generation of ${TARGET_ROWS} rows to ${FILE_PATH}`);
    
    const stream = fs.createWriteStream(FILE_PATH);
    stream.write('order_id,customer_id,product_category,amount,order_date,status\n');
    
    let i = 1;
    let ok = true;
    
    const writeBatch = () => {
        return new Promise((resolve) => {
            const write = () => {
                while (i <= TARGET_ROWS && ok) {
                    const order_id = `ORD-${i}`;
                    const customer_id = `CUST-${Math.floor(Math.random() * 50000) + 1}`;
                    const product_category = categories[Math.floor(Math.random() * categories.length)];
                    const amount = (Math.random() * 500 + 10).toFixed(2);
                    const order_date = getRandomDate(new Date(2022, 0, 1), new Date());
                    const status = statuses[Math.floor(Math.random() * statuses.length)];
                    
                    const row = `${order_id},${customer_id},${product_category},${amount},${order_date},${status}\n`;
                    
                    if (i === TARGET_ROWS) {
                        stream.write(row, () => {
                            resolve();
                        });
                        i++;
                    } else {
                        ok = stream.write(row);
                        i++;
                        if (i % 100000 === 0) {
                            process.stdout.write(`\rGenerated ${i} rows...`);
                        }
                    }
                }
                
                if (i <= TARGET_ROWS) {
                    stream.once('drain', () => {
                        ok = true;
                        write();
                    });
                }
            };
            write();
        });
    };
    
    await writeBatch();
    console.log(`\nFinished generating ${TARGET_ROWS} rows.`);
    stream.end();
}

generate().catch(console.error);
