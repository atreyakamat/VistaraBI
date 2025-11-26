/**
 * Test Dashboard Flow - Hardcoded End-to-End Test
 * Simulates Modules 1-5: Upload → Clean → Domain → Relationships → Dashboard
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Sample test data
const testData = {
  customers: [
    { customer_id: 'C001', name: 'John Doe', email: 'john@example.com', segment: 'Premium', country: 'USA' },
    { customer_id: 'C002', name: 'Jane Smith', email: 'jane@example.com', segment: 'Standard', country: 'UK' },
    { customer_id: 'C003', name: 'Bob Johnson', email: 'bob@example.com', segment: 'Premium', country: 'Canada' },
    { customer_id: 'C004', name: 'Alice Brown', email: 'alice@example.com', segment: 'Standard', country: 'USA' },
    { customer_id: 'C005', name: 'Charlie Wilson', email: 'charlie@example.com', segment: 'Premium', country: 'UK' }
  ],
  products: [
    { product_id: 'P001', name: 'Laptop Pro', category: 'Electronics', price: 1299.99, stock: 50 },
    { product_id: 'P002', name: 'Wireless Mouse', category: 'Electronics', price: 29.99, stock: 200 },
    { product_id: 'P003', name: 'Office Chair', category: 'Furniture', price: 299.99, stock: 75 },
    { product_id: 'P004', name: 'Standing Desk', category: 'Furniture', price: 599.99, stock: 30 },
    { product_id: 'P005', name: 'Monitor 4K', category: 'Electronics', price: 499.99, stock: 100 }
  ],
  sales: [
    { sale_id: 'S001', customer_id: 'C001', product_id: 'P001', quantity: 1, total_amount: 1299.99, sale_date: '2024-01-15' },
    { sale_id: 'S002', customer_id: 'C001', product_id: 'P002', quantity: 2, total_amount: 59.98, sale_date: '2024-01-15' },
    { sale_id: 'S003', customer_id: 'C002', product_id: 'P003', quantity: 1, total_amount: 299.99, sale_date: '2024-01-20' },
    { sale_id: 'S004', customer_id: 'C003', product_id: 'P004', quantity: 1, total_amount: 599.99, sale_date: '2024-02-10' },
    { sale_id: 'S005', customer_id: 'C004', product_id: 'P005', quantity: 2, total_amount: 999.98, sale_date: '2024-02-15' },
    { sale_id: 'S006', customer_id: 'C005', product_id: 'P001', quantity: 1, total_amount: 1299.99, sale_date: '2024-03-01' },
    { sale_id: 'S007', customer_id: 'C001', product_id: 'P003', quantity: 2, total_amount: 599.98, sale_date: '2024-03-10' },
    { sale_id: 'S008', customer_id: 'C002', product_id: 'P002', quantity: 5, total_amount: 149.95, sale_date: '2024-03-15' },
    { sale_id: 'S009', customer_id: 'C003', product_id: 'P005', quantity: 1, total_amount: 499.99, sale_date: '2024-04-01' },
    { sale_id: 'S010', customer_id: 'C004', product_id: 'P004', quantity: 1, total_amount: 599.99, sale_date: '2024-04-20' }
  ]
};

async function runTestDashboard() {
  try {
    console.log('\n🚀 Starting Test Dashboard Flow...\n');

    // MODULE 1: Upload
    console.log('📤 MODULE 1: Creating Project & Uploading Data...');
    const projectId = uuidv4();
    const project = await prisma.project.create({
      data: {
        id: projectId,
        name: 'Test Dashboard Project',
        description: 'Hardcoded test for dashboard visualization',
        status: 'active',
        fileCount: 3,
        totalRecords: testData.customers.length + testData.products.length + testData.sales.length
      }
    });
    console.log(`✅ Project created: ${project.id}`);

    // Create uploads for each dataset
    const uploads = {};
    for (const [tableName, rows] of Object.entries(testData)) {
      const uploadId = uuidv4();
      const upload = await prisma.upload.create({
        data: {
          id: uploadId,
          projectId: project.id,
          fileName: `${tableName}.csv`,
          originalName: `${tableName}.csv`,
          fileType: '.csv',
          fileSize: '1000',
          filePath: `/test/${tableName}.csv`,
          status: 'completed',
          recordsProcessed: rows.length,
          totalRecords: rows.length,
          tableName: `test_${tableName}_${Date.now()}`
        }
      });

      // Store data in data_rows
      for (const row of rows) {
        await prisma.dataRow.create({
          data: {
            uploadId: upload.id,
            data: row
          }
        });
      }

      uploads[tableName] = upload;
      console.log(`✅ Uploaded ${tableName}: ${rows.length} records`);
    }

    // MODULE 2: Cleaning (skip - data is already clean)
    console.log('\n🧹 MODULE 2: Data Cleaning...');
    console.log('✅ Data already clean - skipping');

    // MODULE 3: Domain Detection
    console.log('\n🎯 MODULE 3: Domain Detection...');
    await prisma.project.update({
      where: { id: project.id },
      data: { combinedDomain: 'E-Commerce' }
    });
    console.log('✅ Domain detected: E-Commerce');

    // MODULE 4: Relationship Detection
    console.log('\n🔗 MODULE 4: Detecting Relationships...');
    const relationships = [
      {
        projectId: project.id,
        sourceTable: uploads.customers.tableName,
        sourceColumn: 'customer_id',
        targetTable: uploads.sales.tableName,
        targetColumn: 'customer_id',
        relationshipType: 'one-to-many',
        matchRate: 1.0,
        status: 'active'
      },
      {
        projectId: project.id,
        sourceTable: uploads.products.tableName,
        sourceColumn: 'product_id',
        targetTable: uploads.sales.tableName,
        targetColumn: 'product_id',
        relationshipType: 'one-to-many',
        matchRate: 1.0,
        status: 'active'
      }
    ];

    for (const rel of relationships) {
      await prisma.relationship.create({ data: rel });
      console.log(`✅ Created relationship: ${rel.sourceTable}.${rel.sourceColumn} → ${rel.targetTable}.${rel.targetColumn}`);
    }

    // MODULE 5: Dashboard Generation
    console.log('\n📊 MODULE 5: Generating Dashboard...');

    // Calculate KPIs
    const totalRevenue = testData.sales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const avgOrderValue = totalRevenue / testData.sales.length;
    const totalCustomers = testData.customers.length;
    const totalProducts = testData.products.length;

    // Revenue by Segment (Pie Chart Data)
    const revenueBySegment = {};
    testData.sales.forEach(sale => {
      const customer = testData.customers.find(c => c.customer_id === sale.customer_id);
      const segment = customer?.segment || 'Unknown';
      revenueBySegment[segment] = (revenueBySegment[segment] || 0) + sale.total_amount;
    });

    // Revenue by Month (Line Chart Data)
    const revenueByMonth = {};
    testData.sales.forEach(sale => {
      const month = sale.sale_date.substring(0, 7); // YYYY-MM
      revenueByMonth[month] = (revenueByMonth[month] || 0) + sale.total_amount;
    });

    // Revenue by Category (for additional pie chart)
    const revenueByCategory = {};
    testData.sales.forEach(sale => {
      const product = testData.products.find(p => p.product_id === sale.product_id);
      const category = product?.category || 'Unknown';
      revenueByCategory[category] = (revenueByCategory[category] || 0) + sale.total_amount;
    });

    const dashboardData = {
      projectId: project.id,
      kpis: [
        { id: uuidv4(), name: 'Total Revenue', value: totalRevenue, format: 'currency', trend: '+12.5%' },
        { id: uuidv4(), name: 'Average Order Value', value: avgOrderValue, format: 'currency', trend: '+5.2%' },
        { id: uuidv4(), name: 'Total Customers', value: totalCustomers, format: 'number', trend: '+8.3%' },
        { id: uuidv4(), name: 'Total Products', value: totalProducts, format: 'number', trend: '0%' }
      ],
      charts: [
        {
          id: uuidv4(),
          type: 'pie',
          title: 'Revenue by Customer Segment',
          data: {
            labels: Object.keys(revenueBySegment),
            datasets: [{
              label: 'Revenue',
              data: Object.values(revenueBySegment),
              backgroundColor: ['#01B8AA', '#FD625E', '#F2C80F'],
              borderColor: '#ffffff',
              borderWidth: 2
            }]
          },
          position: { row: 1, col: 1 }
        },
        {
          id: uuidv4(),
          type: 'line',
          title: 'Revenue Trend Over Time',
          data: {
            labels: Object.keys(revenueByMonth).sort(),
            datasets: [{
              label: 'Monthly Revenue',
              data: Object.values(revenueByMonth),
              borderColor: '#01B8AA',
              backgroundColor: 'rgba(1, 184, 170, 0.1)',
              tension: 0.4,
              fill: true,
              borderWidth: 3,
              pointRadius: 6,
              pointBackgroundColor: '#01B8AA',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2
            }]
          },
          position: { row: 1, col: 2 }
        },
        {
          id: uuidv4(),
          type: 'pie',
          title: 'Revenue by Product Category',
          data: {
            labels: Object.keys(revenueByCategory),
            datasets: [{
              label: 'Revenue',
              data: Object.values(revenueByCategory),
              backgroundColor: ['#FD625E', '#F2C80F'],
              borderColor: '#ffffff',
              borderWidth: 2
            }]
          },
          position: { row: 2, col: 1 }
        }
      ],
      metadata: {
        generatedAt: new Date().toISOString(),
        dataRange: {
          start: '2024-01-15',
          end: '2024-04-20'
        },
        totalRecords: testData.sales.length
      }
    };

    // Save dashboard to database
    const dashboard = await prisma.dashboard.create({
      data: {
        projectId: project.id,
        title: 'E-Commerce Sales Dashboard',
        description: 'Comprehensive sales analysis dashboard',
        config: dashboardData,
        status: 'active'
      }
    });

    console.log(`✅ Dashboard created: ${dashboard.id}`);

    // Display results
    console.log('\n' + '='.repeat(60));
    console.log('📊 DASHBOARD SUMMARY');
    console.log('='.repeat(60));
    console.log('\n📈 KEY METRICS:');
    dashboardData.kpis.forEach(kpi => {
      const value = kpi.format === 'currency' ? `$${kpi.value.toFixed(2)}` : kpi.value;
      console.log(`   ${kpi.name}: ${value} (${kpi.trend})`);
    });

    console.log('\n📊 PIE CHART 1 - Revenue by Customer Segment:');
    Object.entries(revenueBySegment).forEach(([segment, revenue]) => {
      console.log(`   ${segment}: $${revenue.toFixed(2)}`);
    });

    console.log('\n📈 LINE CHART - Revenue Trend:');
    Object.entries(revenueByMonth).sort().forEach(([month, revenue]) => {
      console.log(`   ${month}: $${revenue.toFixed(2)}`);
    });

    console.log('\n📊 PIE CHART 2 - Revenue by Product Category:');
    Object.entries(revenueByCategory).forEach(([category, revenue]) => {
      console.log(`   ${category}: $${revenue.toFixed(2)}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log(`\n✅ Test completed successfully!`);
    console.log(`\n🌐 View dashboard: http://localhost:3000/project/${project.id}/dashboard`);
    console.log(`   Project ID: ${project.id}`);
    console.log(`   Dashboard ID: ${dashboard.id}\n`);

    return { project, dashboard, dashboardData };

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTestDashboard();
}

export { runTestDashboard };
