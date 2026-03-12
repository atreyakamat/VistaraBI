
import fs from 'fs';
import path from 'path';

const DOMAINS = {
  ECOMMERCE: ['customers', 'products', 'orders', 'invoices', 'shipments'],
  SAAS: ['users', 'subscriptions', 'usage_logs', 'invoices', 'support_tickets'],
  EDTECH: ['students', 'courses', 'enrollments', 'assessments', 'platform_activity'],
};

const BASE_DIR = './dummy-data';
const CLEAN_DIR = path.join(BASE_DIR, 'clean');
const DIRTY_DIR = path.join(BASE_DIR, 'dirty');
const RECORD_COUNT = 50;

// Ensure directories exist
[BASE_DIR, CLEAN_DIR, DIRTY_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

Object.keys(DOMAINS).forEach(domain => {
  [CLEAN_DIR, DIRTY_DIR].forEach(typeDir => {
    const domainDir = path.join(typeDir, domain.toLowerCase());
    if (!fs.existsSync(domainDir)) fs.mkdirSync(domainDir, { recursive: true });
  });
});

const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split('T')[0];

const injectErrors = (record) => {
  const dirty = { ...record };
  const keys = Object.keys(dirty);
  
  // 15% chance to mess up a record
  if (Math.random() < 0.15) {
    const targetKey = getRandomItem(keys);
    const dice = Math.random();
    
    if (dice < 0.2) dirty[targetKey] = null; // Nulls
    else if (dice < 0.4) dirty[targetKey] = ""; // Empty strings
    else if (dice < 0.6 && typeof dirty[targetKey] === 'string') {
        if (dirty[targetKey].includes('-')) dirty[targetKey] = dirty[targetKey].split('-').reverse().join('/');
        else dirty[targetKey] = `  ${dirty[targetKey]}  `;
    }
    else if (dice < 0.8 && (typeof dirty[targetKey] === 'number' || !isNaN(dirty[targetKey]))) {
        dirty[targetKey] = Number(dirty[targetKey]) * 100;
    }
    else if (typeof dirty[targetKey] === 'string') {
        dirty[targetKey] = dirty[targetKey].toLowerCase();
    }
  }
  return dirty;
};

const generators = {
  ECOMMERCE: {
    customers: (i) => ({ id: `CUST-${i}`, name: `Customer ${i}`, email: `user${i}@example.com`, country: getRandomItem(['USA', 'UK', 'CA', 'DE']), joined: getRandomDate(new Date(2020, 0, 1), new Date()) }),
    orders: (i) => ({ order_id: `ORD-${i}`, customer_id: `CUST-${Math.floor(i/2) + 1}`, amount: (Math.random() * 500).toFixed(2), date: getRandomDate(new Date(2023, 0, 1), new Date()), status: getRandomItem(['Shipped', 'Pending', 'Cancelled']) }),
    products: (i) => ({ sku: `SKU-${i}`, name: `Product ${i}`, price: (Math.random() * 100).toFixed(2), category: getRandomItem(['Electronics', 'Home', 'Fashion']) }),
    invoices: (i) => ({ inv_id: `INV-${i}`, order_id: `ORD-${i}`, tax: (Math.random() * 20).toFixed(2), total: (Math.random() * 600).toFixed(2) }),
    shipments: (i) => ({ ship_id: `SHIP-${i}`, order_id: `ORD-${i}`, carrier: getRandomItem(['FedEx', 'UPS', 'DHL']), tracking: `TRK${i}XYZ` })
  },
  SAAS: {
    users: (i) => ({ user_id: `U-${i}`, email: `dev${i}@startup.io`, role: getRandomItem(['Admin', 'User', 'Editor']), last_login: getRandomDate(new Date(2024, 0, 1), new Date()) }),
    subscriptions: (i) => ({ sub_id: `SUB-${i}`, user_id: `U-${i}`, plan: getRandomItem(['Free', 'Pro', 'Enterprise']), mrr: getRandomItem([0, 49, 299]) }),
    usage_logs: (i) => ({ log_id: `LOG-${i}`, user_id: `U-${Math.floor(i/10) + 1}`, feature: getRandomItem(['API', 'Dashboard', 'Export']), count: Math.floor(Math.random() * 100) }),
    invoices: (i) => ({ inv_id: `SINV-${i}`, sub_id: `SUB-${i}`, amount: (Math.random() * 300).toFixed(2), status: getRandomItem(['Paid', 'Failed', 'Open']) }),
    support_tickets: (i) => ({ ticket_id: `TKT-${i}`, user_id: `U-${Math.floor(i/5) + 1}`, priority: getRandomItem(['High', 'Low']), resolved: Math.random() > 0.5 })
  },
  EDTECH: { 
    students: (i) => ({ id: `STU-${i}`, name: `Student ${i}`, grade: Math.floor(Math.random() * 12) + 1 }),
    courses: (i) => ({ id: `CRS-${i}`, title: `Course ${i}`, instructor: `Prof. ${i % 10}` }),
    enrollments: (i) => ({ id: `ENR-${i}`, student_id: `STU-${i}`, course_id: `CRS-${i % 10 + 1}` }),
    assessments: (i) => ({ id: `ASMT-${i}`, student_id: `STU-${i}`, score: Math.floor(Math.random() * 100) }),
    platform_activity: (i) => ({ id: `ACT-${i}`, student_id: `STU-${i}`, minutes: Math.floor(Math.random() * 120) })
  },
};

const toCSV = (data) => {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => {
    let v = row[h];
    if (v === null || v === undefined) return '';
    v = String(v);
    return (v.includes(',') || v.includes('"')) ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(','));
  return [headers.join(','), ...rows].join('\n');
};

console.log('Generating dummy datasets (Clean & Dirty)...');

Object.entries(DOMAINS).forEach(([domain, fileTypes]) => {
  fileTypes.forEach(fileType => {
    const cleanData = [];
    const dirtyData = [];
    
    for (let i = 1; i <= RECORD_COUNT; i++) {
      const record = generators[domain][fileType](i);
      cleanData.push(record);
      dirtyData.push(injectErrors(record));
    }

    const cleanPath = path.join(CLEAN_DIR, domain.toLowerCase(), `${fileType}.csv`);
    fs.writeFileSync(cleanPath, toCSV(cleanData));

    const dirtyPath = path.join(DIRTY_DIR, domain.toLowerCase(), `${fileType}.csv`);
    fs.writeFileSync(dirtyPath, toCSV(dirtyData));
  });
  console.log(`- Finished ${domain}`);
});

console.log(`\nSuccess! Datasets generated in ${BASE_DIR}`);
