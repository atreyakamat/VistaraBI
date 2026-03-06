
import fs from 'fs';
import path from 'path';

const DOMAINS = {
  ECOMMERCE: ['customers', 'products', 'orders', 'invoices', 'shipments'],
  SAAS: ['users', 'subscriptions', 'usage_logs', 'invoices', 'support_tickets'],
  EDTECH: ['students', 'courses', 'enrollments', 'assessments', 'platform_activity'],
  RETAIL: ['inventory', 'sales', 'suppliers', 'stores', 'promotions'],
  SERVICES: ['clients', 'projects', 'timesheets', 'invoices', 'resource_allocation'],
  MANUFACTURING: ['production_batches', 'quality_checks', 'raw_materials', 'maintenance_logs', 'work_orders'],
  HEALTHCARE: ['patients', 'appointments', 'billing_records', 'prescriptions', 'lab_results'],
  FINANCE: ['accounts', 'transactions', 'loan_applications', 'asset_portfolios', 'market_data_snapshots']
};

const BASE_DIR = './test-data-large';
const CLEAN_DIR = path.join(BASE_DIR, 'clean');
const DIRTY_DIR = path.join(BASE_DIR, 'dirty');
const RECORD_COUNT = 20000;

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
  
  // 10% chance to mess up a record
  if (Math.random() < 0.15) {
    const targetKey = getRandomItem(keys);
    const dice = Math.random();
    
    if (dice < 0.2) dirty[targetKey] = null; // Nulls
    else if (dice < 0.4) dirty[targetKey] = ""; // Empty strings
    else if (dice < 0.6 && typeof dirty[targetKey] === 'string') {
        // Date format variation if it looks like a date
        if (dirty[targetKey].includes('-')) dirty[targetKey] = dirty[targetKey].split('-').reverse().join('/');
        else dirty[targetKey] = `  ${dirty[targetKey]}  `; // Extra whitespace
    }
    else if (dice < 0.8 && typeof dirty[targetKey] === 'number' || !isNaN(dirty[targetKey])) {
        dirty[targetKey] = Number(dirty[targetKey]) * 100; // Outlier
    }
    else if (typeof dirty[targetKey] === 'string') {
        dirty[targetKey] = dirty[targetKey].toLowerCase(); // Case inconsistency
    }
  }
  return dirty;
};

const generators = {
  // Shared helpers
  currency: () => getRandomItem(['USD', 'EUR', 'GBP', 'JPY']),
  status: (opts) => getRandomItem(opts),

  ECOMMERCE: {
    customers: (i) => ({ id: `CUST-${i}`, name: `Customer ${i}`, email: `user${i}@example.com`, country: getRandomItem(['USA', 'UK', 'CA', 'DE']), joined: getRandomDate(new Date(2020, 0, 1), new Date()) }),
    orders: (i) => ({ order_id: `ORD-${i}`, customer_id: `CUST-${Math.floor(i/2)}`, amount: (Math.random() * 500).toFixed(2), date: getRandomDate(new Date(2023, 0, 1), new Date()), status: getRandomItem(['Shipped', 'Pending', 'Cancelled']) }),
    products: (i) => ({ sku: `SKU-${i}`, name: `Product ${i}`, price: (Math.random() * 100).toFixed(2), category: getRandomItem(['Electronics', 'Home', 'Fashion']) }),
    invoices: (i) => ({ inv_id: `INV-${i}`, order_id: `ORD-${i}`, tax: (Math.random() * 20).toFixed(2), total: (Math.random() * 600).toFixed(2) }),
    shipments: (i) => ({ ship_id: `SHIP-${i}`, order_id: `ORD-${i}`, carrier: getRandomItem(['FedEx', 'UPS', 'DHL']), tracking: `TRK${i}XYZ` })
  },
  SAAS: {
    users: (i) => ({ user_id: `U-${i}`, email: `dev${i}@startup.io`, role: getRandomItem(['Admin', 'User', 'Editor']), last_login: getRandomDate(new Date(2024, 0, 1), new Date()) }),
    subscriptions: (i) => ({ sub_id: `SUB-${i}`, user_id: `U-${i}`, plan: getRandomItem(['Free', 'Pro', 'Enterprise']), mrr: getRandomItem([0, 49, 299]) }),
    usage_logs: (i) => ({ log_id: `LOG-${i}`, user_id: `U-${Math.floor(i/10)}`, feature: getRandomItem(['API', 'Dashboard', 'Export']), count: Math.floor(Math.random() * 100) }),
    invoices: (i) => ({ inv_id: `SINV-${i}`, sub_id: `SUB-${i}`, amount: (Math.random() * 300).toFixed(2), status: getRandomItem(['Paid', 'Failed', 'Open']) }),
    support_tickets: (i) => ({ ticket_id: `TKT-${i}`, user_id: `U-${Math.floor(i/5)}`, priority: getRandomItem(['High', 'Low']), resolved: Math.random() > 0.5 })
  },
  // Adding placeholders for others to keep script size manageable but functional for all domains
  EDTECH: { 
    students: (i) => ({ id: `STU-${i}`, name: `Student ${i}`, grade: Math.floor(Math.random() * 12) + 1 }),
    courses: (i) => ({ id: `CRS-${i}`, title: `Course ${i}`, instructor: `Prof. ${i % 100}` }),
    enrollments: (i) => ({ id: `ENR-${i}`, student_id: `STU-${i}`, course_id: `CRS-${i % 1000}` }),
    assessments: (i) => ({ id: `ASMT-${i}`, student_id: `STU-${i}`, score: Math.floor(Math.random() * 100) }),
    platform_activity: (i) => ({ id: `ACT-${i}`, student_id: `STU-${i}`, minutes: Math.floor(Math.random() * 120) })
  },
  RETAIL: {
    inventory: (i) => ({ sku: `RSKU-${i}`, qty: Math.floor(Math.random() * 1000), aisle: Math.floor(Math.random() * 50) }),
    sales: (i) => ({ id: `SALE-${i}`, sku: `RSKU-${i}`, store: `Store-${i % 10}`, total: (Math.random() * 200).toFixed(2) }),
    suppliers: (i) => ({ id: `SUP-${i}`, name: `Supplier ${i}`, lead_time: Math.floor(Math.random() * 30) }),
    stores: (i) => ({ id: `Store-${i}`, location: `City-${i % 100}`, manager: `Manager ${i}` }),
    promotions: (i) => ({ id: `PROM-${i}`, discount: `${Math.floor(Math.random() * 50)}%`, active: Math.random() > 0.5 })
  },
  SERVICES: {
    clients: (i) => ({ id: `CLI-${i}`, name: `Client ${i}`, industry: getRandomItem(['Tech', 'Finance', 'Healthcare']) }),
    projects: (i) => ({ id: `PRJ-${i}`, client_id: `CLI-${i % 1000}`, budget: Math.floor(Math.random() * 50000) }),
    timesheets: (i) => ({ id: `TS-${i}`, project_id: `PRJ-${i % 1000}`, hours: (Math.random() * 8).toFixed(1) }),
    invoices: (i) => ({ id: `INV-${i}`, client_id: `CLI-${i % 1000}`, amount: Math.floor(Math.random() * 5000) }),
    resource_allocation: (i) => ({ id: `RES-${i}`, project_id: `PRJ-${i}`, staff_id: `S-${i % 100}` })
  },
  MANUFACTURING: {
    production_batches: (i) => ({ id: `BAT-${i}`, line: `Line-${i % 5}`, output: Math.floor(Math.random() * 1000) }),
    quality_checks: (i) => ({ id: `QC-${i}`, batch_id: `BAT-${i}`, passed: Math.random() > 0.1 }),
    raw_materials: (i) => ({ id: `MAT-${i}`, type: `Material-${i % 20}`, stock: Math.floor(Math.random() * 10000) }),
    maintenance_logs: (i) => ({ id: `MNT-${i}`, machine: `Mach-${i % 50}`, date: getRandomDate(new Date(2024, 0, 1), new Date()) }),
    work_orders: (i) => ({ id: `WO-${i}`, priority: getRandomItem(['Normal', 'Urgent']) })
  },
  HEALTHCARE: {
    patients: (i) => ({ id: `PAT-${i}`, dob: getRandomDate(new Date(1950, 0, 1), new Date(2010, 0, 1)), blood_type: getRandomItem(['A+', 'B+', 'O-', 'AB+']) }),
    appointments: (i) => ({ id: `APT-${i}`, patient_id: `PAT-${i}`, dept: getRandomItem(['ER', 'OPD', 'Cardio']) }),
    billing_records: (i) => ({ id: `BILL-${i}`, patient_id: `PAT-${i}`, amount: (Math.random() * 2000).toFixed(2) }),
    prescriptions: (i) => ({ id: `RX-${i}`, patient_id: `PAT-${i}`, drug: `Drug-${i % 100}` }),
    lab_results: (i) => ({ id: `LAB-${i}`, patient_id: `PAT-${i}`, status: getRandomItem(['Final', 'Pending']) })
  },
  FINANCE: {
    accounts: (i) => ({ id: `ACC-${i}`, type: getRandomItem(['Checking', 'Savings']), balance: (Math.random() * 100000).toFixed(2) }),
    transactions: (i) => ({ id: `TXN-${i}`, acc_id: `ACC-${i % 5000}`, amount: (Math.random() * 1000).toFixed(2) }),
    loan_applications: (i) => ({ id: `LOAN-${i}`, amount: Math.floor(Math.random() * 50000), score: Math.floor(Math.random() * 850) }),
    asset_portfolios: (i) => ({ id: `PORT-${i}`, value: (Math.random() * 1000000).toFixed(2) }),
    market_data_snapshots: (i) => ({ id: `MKT-${i}`, symbol: `SYM-${i % 500}`, price: (Math.random() * 500).toFixed(2) })
  }
};

const toCSV = (data) => {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => {
    let v = row[h];
    if (v === null) return '';
    v = String(v);
    return (v.includes(',') || v.includes('"')) ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(','));
  return [headers.join(','), ...rows].join('\n');
};

console.log('Generating 40 large datasets (5 per domain, Clean & Dirty)...');

Object.entries(DOMAINS).forEach(([domain, fileTypes]) => {
  fileTypes.forEach(fileType => {
    const cleanData = [];
    const dirtyData = [];
    
    for (let i = 1; i <= RECORD_COUNT; i++) {
      const record = generators[domain][fileType](i);
      cleanData.push(record);
      dirtyData.push(injectErrors(record));
    }

    // Write Clean
    const cleanPath = path.join(CLEAN_DIR, domain.toLowerCase(), `${fileType}.csv`);
    fs.writeFileSync(cleanPath, toCSV(cleanData));

    // Write Dirty
    const dirtyPath = path.join(DIRTY_DIR, domain.toLowerCase(), `${fileType}.csv`);
    fs.writeFileSync(dirtyPath, toCSV(dirtyData));
  });
  console.log(`- Finished ${domain}`);
});

console.log(`\nSuccess! Datasets generated in ${BASE_DIR}`);
console.log(`Clean data: ${CLEAN_DIR}`);
console.log(`Dirty data (for testing cleaning/errors): ${DIRTY_DIR}`);
