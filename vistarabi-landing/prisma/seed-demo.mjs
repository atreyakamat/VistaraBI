import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import Papa from 'papaparse';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@vistarabi.com';
const DEMO_PASSWORD = 'VistaraDemo@2026';
const DEMO_PREFIX = 'Demo - ';

const DOMAIN_META = {
  ECOMMERCE: { name: 'E-Commerce', icon: 'shopping-cart', color: '#2563eb', csv: 'ecommerce_demo.csv' },
  SAAS: { name: 'SaaS', icon: 'cloud', color: '#7c3aed', csv: 'saas_demo.csv' },
  RETAIL: { name: 'Retail', icon: 'store', color: '#059669', csv: 'retail_demo.csv' },
  EDTECH: { name: 'EdTech', icon: 'graduation-cap', color: '#d97706', csv: 'edtech_demo.csv' },
  MANUFACTURING: { name: 'Manufacturing', icon: 'factory', color: '#dc2626', csv: 'manufacturing_demo.csv' },
  HEALTHCARE: { name: 'Healthcare', icon: 'heart-pulse', color: '#0891b2', csv: 'healthcare_demo.csv' },
  FINANCE: { name: 'Finance', icon: 'landmark', color: '#16a34a', csv: 'finance_demo.csv' },
  SERVICES: { name: 'Services', icon: 'briefcase-business', color: '#4f46e5', csv: 'services_demo.csv' },
};

const DOMAIN_KPIS = {
  ECOMMERCE: [
    kpi('Total Revenue', 'revenue', 'SUM', 'revenue', 'currency', 'order_date', 'category'),
    kpi('Total Orders', 'order_id', 'COUNT', 'growth', 'count', 'order_date', 'category'),
    kpi('Unique Customers', 'user_id', 'COUNT_DISTINCT', 'customer', 'count', 'order_date', 'customer_segment'),
    kpi('Units Sold', 'quantity', 'SUM', 'product', 'count', 'order_date', 'category'),
    kpi('Discount Given', 'discount_amount', 'SUM', 'pricing', 'currency', 'order_date', 'category'),
  ],
  SAAS: [
    kpi('Monthly Recurring Revenue', 'mrr', 'SUM', 'revenue', 'currency', 'signup_date', 'plan_name'),
    kpi('Annual Recurring Revenue', 'arr', 'SUM', 'revenue', 'currency', 'signup_date', 'plan_name'),
    kpi('Customers', 'customer_id', 'COUNT_DISTINCT', 'customer', 'count', 'signup_date', 'plan_name'),
    kpi('Average CAC', 'cac', 'AVG', 'acquisition', 'currency', 'signup_date', 'referral_source'),
    kpi('Average LTV', 'ltv', 'AVG', 'customer', 'currency', 'signup_date', 'plan_name'),
  ],
  RETAIL: [
    kpi('Retail Revenue', 'revenue', 'SUM', 'revenue', 'currency', 'sale_date', 'department'),
    kpi('Units Sold', 'units_sold', 'SUM', 'sales', 'count', 'sale_date', 'department'),
    kpi('Gross Profit', 'gross_profit', 'SUM', 'financial', 'currency', 'sale_date', 'department'),
    kpi('Foot Traffic', 'foot_traffic', 'SUM', 'operations', 'count', 'sale_date', 'store_name'),
    kpi('Average Return Rate', 'return_rate', 'AVG', 'quality', 'percent', 'sale_date', 'department'),
  ],
  EDTECH: [
    kpi('Course Revenue', 'payment_amount', 'SUM', 'revenue', 'currency', 'enrollment_date', 'subject'),
    kpi('Students', 'student_id', 'COUNT_DISTINCT', 'customer', 'count', 'enrollment_date', 'subject'),
    kpi('Average Score', 'score', 'AVG', 'quality', 'score', 'enrollment_date', 'subject'),
    kpi('Average Progress', 'progress_pct', 'AVG', 'engagement', 'percent', 'enrollment_date', 'subject'),
    kpi('Learning Hours', 'time_spent_hours', 'SUM', 'engagement', 'hours', 'enrollment_date', 'subject'),
  ],
  MANUFACTURING: [
    kpi('Units Produced', 'units_produced', 'SUM', 'operations', 'count', 'production_date', 'product_line'),
    kpi('Defective Units', 'units_defective', 'SUM', 'quality', 'count', 'production_date', 'product_line'),
    kpi('Average OEE', 'oee_score', 'AVG', 'efficiency', 'percent', 'production_date', 'product_line'),
    kpi('Downtime Hours', 'downtime_hours', 'SUM', 'operations', 'hours', 'production_date', 'machine_id'),
    kpi('Average Yield Rate', 'yield_rate', 'AVG', 'quality', 'percent', 'production_date', 'product_line'),
  ],
  HEALTHCARE: [
    kpi('Patients Served', 'patient_id', 'COUNT_DISTINCT', 'operations', 'count', 'admission_date', 'department'),
    kpi('Treatment Cost', 'treatment_cost', 'SUM', 'financial', 'currency', 'admission_date', 'department'),
    kpi('Average LOS', 'los_days', 'AVG', 'operations', 'days', 'admission_date', 'department'),
    kpi('Patient Satisfaction', 'patient_satisfaction', 'AVG', 'quality', 'score', 'admission_date', 'department'),
    kpi('Average Wait Time', 'wait_time_minutes', 'AVG', 'operations', 'minutes', 'admission_date', 'department'),
  ],
  FINANCE: [
    kpi('Transaction Volume', 'amount', 'SUM', 'financial', 'currency', 'transaction_date', 'asset_class'),
    kpi('Net Profit', 'net_profit', 'SUM', 'financial', 'currency', 'transaction_date', 'asset_class'),
    kpi('Gross Revenue', 'gross_revenue', 'SUM', 'revenue', 'currency', 'transaction_date', 'asset_class'),
    kpi('Operating Expense', 'operating_expense', 'SUM', 'financial', 'currency', 'transaction_date', 'asset_class'),
    kpi('Average ROI', 'roi', 'AVG', 'growth', 'percent', 'transaction_date', 'asset_class'),
  ],
  SERVICES: [
    kpi('Services Revenue', 'revenue', 'SUM', 'revenue', 'currency', 'start_date', 'service_type'),
    kpi('Service Cost', 'cost', 'SUM', 'financial', 'currency', 'start_date', 'service_type'),
    kpi('Billable Hours', 'billable_hours', 'SUM', 'operations', 'hours', 'start_date', 'service_type'),
    kpi('Average Margin', 'margin_pct', 'AVG', 'financial', 'percent', 'start_date', 'service_type'),
    kpi('Client Satisfaction', 'client_satisfaction', 'AVG', 'quality', 'score', 'start_date', 'industry_vertical'),
  ],
};

function kpi(name, column, aggregation, category, unit, dateColumn, groupBy) {
  return { name, column, aggregation, category, unit, dateColumn, groupBy };
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function metricFormula(metric) {
  if (metric.aggregation === 'COUNT_DISTINCT') return `COUNT(DISTINCT ${metric.column})`;
  return `${metric.aggregation}(${metric.column})`;
}

function loadCsv(fileName) {
  const path = join(process.cwd(), 'datasets', 'demo', fileName);
  if (!existsSync(path)) {
    throw new Error(`Missing demo CSV: ${path}`);
  }

  const parsed = Papa.parse(readFileSync(path, 'utf8'), {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    throw new Error(`Failed to parse ${fileName}: ${parsed.errors[0].message}`);
  }

  const rows = parsed.data.filter(row =>
    row && typeof row === 'object' && Object.values(row).some(value => value !== null && value !== '')
  );
  const columns = rows[0] ? Object.keys(rows[0]) : [];
  return { rows, columns };
}

function chartFor(metric) {
  if (metric.aggregation === 'AVG') {
    return { chartType: 'line', fallbackType: 'metric_card', reason: 'Average KPI trends clearly over time.' };
  }
  if (metric.aggregation === 'COUNT_DISTINCT') {
    return { chartType: 'bar', fallbackType: 'metric_card', reason: 'Distinct count is well suited to grouped comparison.' };
  }
  return { chartType: 'bar', fallbackType: 'line', reason: 'Summed KPI is best viewed as a grouped or time trend.' };
}

function buildDashboardConfig(projectId, projectName, domain, metrics, blueprintKpis) {
  const meta = DOMAIN_META[domain];
  const cards = blueprintKpis.map((record, index) => {
    const metric = metrics[index];
    const chart = chartFor(metric);
    return {
      kpiId: record.id,
      kpiName: record.name,
      formula: metricFormula(metric),
      category: metric.category,
      chartSelection: {
        chartType: chart.chartType,
        chartLibrary: 'chartjs',
        fallbackType: chart.fallbackType,
        fallbackLibrary: 'chartjs',
        confidence: 0.9,
        reason: chart.reason,
      },
      cardSize: 'md',
      position: index,
      confidence: 95,
      colorAccent: meta.color,
    };
  });

  const section = {
    id: `${domain.toLowerCase()}-overview`,
    title: `${meta.name} Overview`,
    description: `Seeded KPI dashboard for ${meta.name}`,
    icon: meta.icon,
    order: 1,
    cards,
    collapsed: false,
  };

  return {
    sections: [section],
    sidebarConfig: {
      projectId,
      projectName,
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', route: `/app/projects/${projectId}/dashboard`, enabled: true },
        { id: 'kpis', label: 'KPIs', icon: 'chart-no-axes-combined', route: `/app/projects/${projectId}/kpis`, enabled: true },
        { id: 'sources', label: 'Sources', icon: 'database', route: `/app/projects/${projectId}`, enabled: true },
      ],
    },
    metadata: {
      domain,
      domainName: meta.name,
      domainIcon: meta.icon,
      domainColor: meta.color,
      totalKPIs: cards.length,
      totalSections: 1,
      generatedAt: new Date().toISOString(),
      version: 1,
      kpiExplanations: Object.fromEntries(cards.map(card => [
        card.kpiId,
        {
          kpiId: card.kpiId,
          explanation: `Tracks ${card.kpiName} for the seeded ${meta.name} demo project.`,
          formulaSummary: card.formula,
          dataSourceRef: `${meta.csv} -> ${card.formula}`,
          businessDefinition: `${card.kpiName} is a core operating metric for ${meta.name}.`,
          recommendation: 'Use filters and Ask AI to compare trend changes across segments.',
          generatedAt: new Date().toISOString(),
        },
      ])),
    },
    version: 1,
  };
}

async function createDemoProject(userId, domain) {
  const meta = DOMAIN_META[domain];
  const metrics = DOMAIN_KPIS[domain];
  const projectName = `${DEMO_PREFIX}${meta.name}`;
  const { rows, columns } = loadCsv(meta.csv);

  const project = await prisma.project.create({
    data: {
      userId,
      name: projectName,
      description: `Ready-to-use ${meta.name} demo project seeded from datasets/demo/${meta.csv}.`,
    },
  });

  await prisma.source.create({
    data: {
      projectId: project.id,
      fileName: meta.csv,
      fileType: 'csv',
      status: 'READY',
      rowCount: rows.length,
      colCount: columns.length,
      columns,
      data: rows,
      qualityScore: 'GOOD',
    },
  });

  await prisma.domainDetection.create({
    data: {
      projectId: project.id,
      detectedDomain: domain,
      confidence: 0.98,
      status: 'AUTO_ASSIGNED',
      scoringBreakdown: { seeded: true, domain },
      matchedColumns: columns,
      explanation: `Seeded demo project for ${meta.name}.`,
    },
  });

  await prisma.domainGovernance.create({
    data: {
      projectId: project.id,
      activeDomain: domain,
      governanceStatus: 'LOCKED',
      isLocked: true,
      version: 1,
      changedBy: 'seed-demo',
      changeReason: 'Demo project seed',
    },
  });

  const blueprint = await prisma.kPIBlueprint.create({
    data: {
      projectId: project.id,
      domain,
      version: 1,
      isLocked: true,
      lockedAt: new Date(),
      lockedBy: 'seed-demo',
      kpis: {
        create: metrics.map(metric => ({
          kpiLibraryId: `${domain.toLowerCase()}_${slug(metric.name)}`,
          name: metric.name,
          description: `Seeded ${metric.name} KPI for ${meta.name}.`,
          sourceTable: 'merged_data',
          category: metric.category,
          unit: metric.unit,
          aggregations: {
            create: [{ function: metric.aggregation, column: metric.column }],
          },
          groupBys: metric.groupBy ? {
            create: [{ column: metric.groupBy }],
          } : undefined,
          lineage: {
            create: {
              formula: metricFormula(metric),
              tables: ['merged_data'],
              joins: [],
            },
          },
        })),
      },
    },
    include: {
      kpis: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  const dashboardConfig = buildDashboardConfig(project.id, project.name, domain, metrics, blueprint.kpis);
  await prisma.dashboardConfig.create({
    data: {
      projectId: project.id,
      sections: dashboardConfig.sections,
      sidebarConfig: dashboardConfig.sidebarConfig,
      metadata: dashboardConfig.metadata,
      version: dashboardConfig.version,
    },
  });

  await prisma.dashboardState.create({
    data: {
      projectId: project.id,
      domain,
      version: 1,
      globalFilters: [],
      granularity: 'monthly',
      cards: {
        create: blueprint.kpis.map((record, index) => ({
          kpiId: record.id,
          kpiName: record.name,
          chartType: dashboardConfig.sections[0].cards[index].chartSelection.chartType,
          cardSize: 'md',
          position: index,
          colSpan: 1,
          rowSpan: 1,
          groupBy: metrics[index].groupBy,
          filterOverrides: [],
          comparisonMode: null,
          isPinned: index < 2,
          isAIGenerated: false,
          isDrillDown: false,
        })),
      },
    },
  });

  return { domain, projectId: project.id, rows: rows.length, kpis: blueprint.kpis.length };
}

async function main() {
  const password = await bcrypt.hash(DEMO_PASSWORD, 12);
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      name: 'VistaraBI Demo',
      password,
      emailVerified: new Date(),
      preferences: { aiMode: 'auto' },
    },
    create: {
      name: 'VistaraBI Demo',
      email: DEMO_EMAIL,
      password,
      emailVerified: new Date(),
      preferences: { aiMode: 'auto' },
    },
  });

  const oldProjects = await prisma.project.findMany({
    where: {
      userId: user.id,
      name: { startsWith: DEMO_PREFIX },
    },
    select: { id: true },
  });

  for (const project of oldProjects) {
    await prisma.project.delete({ where: { id: project.id } });
  }

  const results = [];
  for (const domain of Object.keys(DOMAIN_META)) {
    results.push(await createDemoProject(user.id, domain));
  }

  console.table(results);
  console.log(`Demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
