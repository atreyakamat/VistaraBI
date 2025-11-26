/**
 * Quick Test - Create Dashboard for Existing Project
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const projectId = '95d2e487-e6db-42b2-8a5d-d4c728848241'; // Your existing test project

// Sample aggregated data (would come from real data in production)
const dashboardConfig = {
  projectId,
  kpis: [
    { id: 'kpi1', name: 'Total Revenue', value: 6809.85, format: 'currency', trend: '+12.5%' },
    { id: 'kpi2', name: 'Average Order Value', value: 680.99, format: 'currency', trend: '+5.2%' },
    { id: 'kpi3', name: 'Total Customers', value: 10, format: 'number', trend: '+8.3%' },
    { id: 'kpi4', name: 'Total Products', value: 10, format: 'number', trend: '0%' }
  ],
  charts: [
    {
      id: 'chart1',
      type: 'pie',
      title: 'Revenue by Customer Segment',
      data: {
        labels: ['Premium', 'Standard'],
        datasets: [{
          label: 'Revenue',
          data: [4759.89, 2049.96],
          backgroundColor: ['#01B8AA', '#FD625E'],
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      }
    },
    {
      id: 'chart2',
      type: 'line',
      title: 'Revenue Trend Over Time',
      data: {
        labels: ['2024-01', '2024-02', '2024-03', '2024-04'],
        datasets: [{
          label: 'Monthly Revenue',
          data: [1359.97, 1599.97, 2049.92, 1099.98],
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
      }
    },
    {
      id: 'chart3',
      type: 'pie',
      title: 'Revenue by Product Category',
      data: {
        labels: ['Electronics', 'Furniture'],
        datasets: [{
          label: 'Revenue',
          data: [4309.89, 2499.96],
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
    totalRecords: 20
  }
};

async function createDashboard() {
  try {
    console.log('Creating dashboard for project:', projectId);
    
    const dashboard = await prisma.dashboard.create({
      data: {
        projectId,
        title: 'E-Commerce Sales Dashboard',
        description: 'Complete sales analysis with Pie Charts and Line Graph',
        config: dashboardConfig,
        status: 'active'
      }
    });

    console.log('\n✅ Dashboard created successfully!');
    console.log('Dashboard ID:', dashboard.id);
    console.log('\n🌐 View at: http://localhost:3000/project/' + projectId + '/dashboard\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createDashboard();
