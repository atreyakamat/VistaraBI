// Test Data Generator - Creates realistic business datasets with intentional quality issues

export interface CompanyTestData {
    name: string;
    datasets: {
        orders: any[];
        customers: any[];
        products: any[];
        invoices: any[];
        subscriptions?: any[];
        timesheets?: any[];
    };
    expectedIssues: {
        nulls: number;
        duplicates: number;
        dateFormatVariations: number;
        currencyVariations: number;
        outliers: number;
    };
}

export function generateEcommerceCompany(): CompanyTestData {
    const customers = [
        { id: 1, name: 'John Doe', email: 'john@example.com', country: 'USA', joined: '2024-01-15' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', country: 'UK', joined: '15/02/2024' }, // Different date format
        { id: 3, name: '  Bob Johnson  ', email: '', country: 'Canada', joined: '2024.03.01' }, // Extra spaces, missing email
        { id: 4, name: 'Alice Lee', email: 'alice@example.com', country: 'USA', joined: '2024-01-20' },
        { id: 1, name: 'John Doe', email: 'john@example.com', country: 'USA', joined: '2024-01-15' }, // Duplicate
        { id: 5, name: null, email: 'unknown@example.com', country: 'Germany', joined: '04-15-2024' }, // Null name
    ];

    const products = [
        { id: 'P001', name: 'Laptop', price: '$1,299.99', category: 'Electronics', stock: 45 },
        { id: 'P002', name: 'Mouse', price: '€25.50', category: 'Accessories', stock: 150 },
        { id: 'P003', name: 'Keyboard', price: '£45.00', category: 'accessories', stock: 0 }, // Inconsistent category case
        { id: 'P004', name: 'Monitor', price: '¥35000', category: 'Electronics', stock: 30 },
        { id: 'P005', name: 'USB Cable', price: '$9.99', category: 'Accessories', stock: 500 },
        { id: 'P006', name: 'Headphones', price: '$199.99', category: '', stock: 999999 }, // Outlier stock, missing category
    ];

    const orders = [
        { order_id: 'ORD001', customer_id: 1, product_id: 'P001', quantity: 1, total: '$1,299.99', order_date: '2024-02-01', status: 'Completed' },
        { order_id: 'ORD002', customer_id: 2, product_id: 'P002', quantity: 2, total: '€51.00', order_date: '01/02/2024', status: 'Shipped' },
        { order_id: 'ORD003', customer_id: 3, product_id: 'P003', quantity: null, total: '£45.00', order_date: '2024-02-03', status: 'pending' }, // Null quantity
        { order_id: 'ORD004', customer_id: 4, product_id: 'P005', quantity: 3, total: '$29.97', order_date: '2024.02.04', status: 'Completed' },
        { order_id: 'ORD005', customer_id: 1, product_id: 'P004', quantity: 1, total: '¥35000', order_date: '2024-02-05', status: 'Completed' },
        { order_id: 'ORD002', customer_id: 2, product_id: 'P002', quantity: 2, total: '€51.00', order_date: '01/02/2024', status: 'Shipped' }, // Duplicate
        { order_id: 'ORD006', customer_id: null, product_id: 'P001', quantity: 1, total: '$1,299.99', order_date: '', status: 'Failed' }, // Null customer, missing date
    ];

    const invoices = [
        { invoice_id: 'INV-001', order_id: 'ORD001', amount: '$1,299.99', due_date: '2024-03-01', paid: true },
        { invoice_id: 'INV-002', order_id: 'ORD002', amount: '€51.00', due_date: '03/01/2024', paid: 'yes' }, // Different date format, boolean as string
        { invoice_id: 'INV-003', order_id: 'ORD003', amount: '', due_date: '2024-03-03', paid: false }, // Missing amount
        { invoice_id: 'INV-004', order_id: 'ORD004', amount: '$29.97', due_date: '2024.03.04', paid: 1 }, // Boolean as number
    ];

    return {
        name: 'Acme E-commerce',
        datasets: { customers, products, orders, invoices },
        expectedIssues: {
            nulls: 6,
            duplicates: 2,
            dateFormatVariations: 4,
            currencyVariations: 4,
            outliers: 1,
        },
    };
}

export function generateSaaSCompany(): CompanyTestData {
    const customers = [
        { id: 'CUST-001', company: 'TechCorp', contact_email: 'admin@techcorp.com', plan: 'Enterprise', mrr: '$5,000', signup_date: '2023-01-15' },
        { id: 'CUST-002', company: 'StartupXYZ', contact_email: 'ceo@startupxyz.com', plan: 'Pro', mrr: '€500', signup_date: '15-02-2023' },
        { id: 'CUST-003', company: 'BigCo', contact_email: '', plan: 'enterprise', mrr: '£3,000', signup_date: '2023.03.01' }, // Missing email, inconsistent plan case
        { id: 'CUST-004', company: 'SmallBiz', contact_email: 'owner@smallbiz.com', plan: 'Starter', mrr: '$50', signup_date: '2023-04-10' },
    ];

    const subscriptions = [
        { sub_id: 'SUB-001', customer_id: 'CUST-001', start_date: '2023-01-15', renewal_date: '2024-01-15', status: 'Active', seats: 50 },
        { sub_id: 'SUB-002', customer_id: 'CUST-002', start_date: '15-02-2023', renewal_date: '15-02-2024', status: 'active', seats: 10 },
        { sub_id: 'SUB-003', customer_id: 'CUST-003', start_date: '2023.03.01', renewal_date: null, status: 'Churned', seats: 100 }, // Null renewal
        { sub_id: 'SUB-004', customer_id: 'CUST-004', start_date: '2023-04-10', renewal_date: '2024-04-10', status: 'Active', seats: 2 },
        { sub_id: 'SUB-001', customer_id: 'CUST-001', start_date: '2023-01-15', renewal_date: '2024-01-15', status: 'Active', seats: 50 }, // Duplicate
    ];

    const invoices = [
        { invoice_id: 'INV-2023-001', subscription_id: 'SUB-001', amount: '$5,000', issue_date: '2023-01-15', paid_date: '2023-01-20', status: 'Paid' },
        { invoice_id: 'INV-2023-002', subscription_id: 'SUB-002', amount: '€500', issue_date: '15-02-2023', paid_date: '', status: 'Overdue' }, // Missing paid date
        { invoice_id: 'INV-2023-003', subscription_id: 'SUB-003', amount: '£3,000', issue_date: '2023.03.01', paid_date: '2023.03.05', status: 'Paid' },
    ];

    const timesheets = [
        { employee: 'Alice', project: 'Project Alpha', date: '2024-01-01', hours: 8, rate: '$100' },
        { employee: 'Bob', project: 'Project Beta', date: '01/01/2024', hours: 6, rate: '€90' },
        { employee: 'Charlie', project: 'Project Alpha', date: '2024-01-02', hours: null, rate: '' }, // Null hours, missing rate
        { employee: 'Alice', project: 'Project Gamma', date: '2024.01.03', hours: 10, rate: '$100' },
    ];

    return {
        name: 'CloudSoft SaaS',
        datasets: { customers, subscriptions, invoices, timesheets, orders: [], products: [] },
        expectedIssues: {
            nulls: 4,
            duplicates: 1,
            dateFormatVariations: 4,
            currencyVariations: 4,
            outliers: 0,
        },
    };
}

export function exportToCSV(data: any[], filename: string): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            // Escape commas and quotes
            if (stringValue.includes(',') || stringValue.includes('"')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
}

export function exportToJSON(data: any[]): string {
    return JSON.stringify(data, null, 2);
}

export function exportToXML(data: any[], rootElement: string): string {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootElement}>\n`;

    for (const row of data) {
        xml += '  <item>\n';
        for (const [key, value] of Object.entries(row)) {
            const xmlValue = value === null || value === undefined ? '' : String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            xml += `    <${key}>${xmlValue}</${key}>\n`;
        }
        xml += '  </item>\n';
    }

    xml += `</${rootElement}>`;
    return xml;
}
