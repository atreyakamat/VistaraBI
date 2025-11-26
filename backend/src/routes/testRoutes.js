import express from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/test/create-dashboard
 * Creates a hardcoded test dashboard with sample data
 */
router.post('/create-dashboard', async (req, res) => {
  try {
    console.log('Creating test dashboard...');

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

    // Create project
    const projectId = uuidv4();
    const project = await prisma.project.create({
      data: {
        id: projectId,
        name: 'Test Dashboard Project',
        description: 'Hardcoded test dashboard with sample E-Commerce data',
        status: 'active',
        fileCount: 3,
        totalRecords: testData.customers.length + testData.products.length + testData.sales.length,
        combinedDomain: 'E-Commerce'
      }
    });

    // Create uploads
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

      // Store data
      for (const row of rows) {
        await prisma.dataRow.create({
          data: {
            uploadId: upload.id,
            rowNumber: rows.indexOf(row) + 1,
            data: row
          }
        });
      }

      uploads[tableName] = upload;
    }

    // Calculate dashboard data
    const totalRevenue = testData.sales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const avgOrderValue = totalRevenue / testData.sales.length;

    // Revenue by Segment
    const revenueBySegment = {};
    testData.sales.forEach(sale => {
      const customer = testData.customers.find(c => c.customer_id === sale.customer_id);
      const segment = customer?.segment || 'Unknown';
      revenueBySegment[segment] = (revenueBySegment[segment] || 0) + sale.total_amount;
    });

    // Revenue by Month
    const revenueByMonth = {};
    testData.sales.forEach(sale => {
      const month = sale.sale_date.substring(0, 7);
      revenueByMonth[month] = (revenueByMonth[month] || 0) + sale.total_amount;
    });

    // Revenue by Category
    const revenueByCategory = {};
    testData.sales.forEach(sale => {
      const product = testData.products.find(p => p.product_id === sale.product_id);
      const category = product?.category || 'Unknown';
      revenueByCategory[category] = (revenueByCategory[category] || 0) + sale.total_amount;
    });

    const dashboardConfig = {
      projectId: project.id,
      kpis: [
        { id: uuidv4(), name: 'Total Revenue', value: totalRevenue, format: 'currency', trend: '+12.5%' },
        { id: uuidv4(), name: 'Average Order Value', value: avgOrderValue, format: 'currency', trend: '+5.2%' },
        { id: uuidv4(), name: 'Total Customers', value: testData.customers.length, format: 'number', trend: '+8.3%' },
        { id: uuidv4(), name: 'Total Products', value: testData.products.length, format: 'number', trend: '0%' }
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
          }
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
              pointBackgroundColor: '#01B8AA'
            }]
          }
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
          }
        }
      ],
      metadata: {
        generatedAt: new Date().toISOString(),
        dataRange: { start: '2024-01-15', end: '2024-04-20' },
        totalRecords: testData.sales.length
      }
    };

    // Save dashboard
    const dashboard = await prisma.dashboard.create({
      data: {
        projectId: project.id,
        title: 'E-Commerce Sales Dashboard',
        description: 'Comprehensive sales analysis with pie and line charts',
        config: dashboardConfig,
        status: 'active'
      }
    });

    res.json({
      success: true,
      data: {
        projectId: project.id,
        dashboardId: dashboard.id,
        dashboardUrl: `/project/${project.id}/dashboard`,
        summary: {
          totalRevenue: totalRevenue.toFixed(2),
          avgOrderValue: avgOrderValue.toFixed(2),
          customers: testData.customers.length,
          products: testData.products.length,
          sales: testData.sales.length
        }
      }
    });

  } catch (error) {
    console.error('Test dashboard creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
