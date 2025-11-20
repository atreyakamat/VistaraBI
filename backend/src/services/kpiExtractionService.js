/**
 * KPI Extraction Service (Module 4)
 * Rule-Based KPI Identification and Ranking
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();

// KPI Library loaded from JSON files
let kpiLibraries = {};
let synonymMaps = {};

class KpiExtractionService {
  constructor() {
    this.loadKpiLibraries();
    this.loadSynonymMaps();
  }

  /**
   * Load KPI libraries for all domains
   */
  loadKpiLibraries() {
    const domains = ['retail', 'ecommerce', 'saas', 'healthcare', 'manufacturing', 'logistics', 'financial', 'education'];
    
    domains.forEach(domain => {
      const filePath = path.join(__dirname, '..', 'data', 'kpi-libraries', `${domain}.json`);
      try {
        if (fs.existsSync(filePath)) {
          kpiLibraries[domain] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } else {
          // Use inline default if file doesn't exist
          kpiLibraries[domain] = this.getDefaultKpiLibrary(domain);
        }
      } catch (error) {
        console.warn(`Failed to load KPI library for ${domain}, using defaults`);
        kpiLibraries[domain] = this.getDefaultKpiLibrary(domain);
      }
    });
  }

  /**
   * Load synonym maps for all domains
   */
  loadSynonymMaps() {
    const domains = ['retail', 'ecommerce', 'saas', 'healthcare', 'manufacturing', 'logistics', 'financial', 'education'];
    
    domains.forEach(domain => {
      const filePath = path.join(__dirname, '..', 'data', 'synonym-maps', `${domain}_synonyms.json`);
      try {
        if (fs.existsSync(filePath)) {
          synonymMaps[domain] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } else {
          synonymMaps[domain] = this.getDefaultSynonymMap(domain);
        }
      } catch (error) {
        console.warn(`Failed to load synonym map for ${domain}, using defaults`);
        synonymMaps[domain] = this.getDefaultSynonymMap(domain);
      }
    });
  }

  /**
   * Extract KPIs for domain from cleaned data
   */
  async extractKpis(cleaningJobId, domainJobId) {
    try {
      // Get cleaning job with domain
      const cleaningJob = await prisma.cleaningJob.findUnique({
        where: { id: cleaningJobId },
        include: {
          upload: true,
          domainJobs: true
        }
      });

      if (!cleaningJob) {
        throw new Error('Cleaning job not found');
      }

      // Get domain from domain detection job
      const domainJob = await prisma.domainDetectionJob.findUnique({
        where: { id: domainJobId }
      });

      if (!domainJob) {
        throw new Error('Domain detection job not found');
      }

      const domain = domainJob.detectedDomain;

      // Get cleaned data
      const cleanedData = await prisma.cleanedData.findFirst({
        where: { tableName: cleaningJob.cleanedTableName }
      });

      if (!cleanedData) {
        throw new Error('Cleaned data not found');
      }

      const columns = cleanedData.columns || [];
      const rows = cleanedData.data || [];

      // Extract KPIs
      const extraction = this._extractKpisFromData(columns, rows, domain);

      // Create KPI extraction job
      const kpiJob = await prisma.kpiExtractionJob.create({
        data: {
          id: uuidv4(),
          domainJobId: domainJobId,
          cleaningJobId: cleaningJobId,
          domain: domain,
          totalKpisInLibrary: extraction.totalKpisInLibrary,
          feasibleCount: extraction.feasibleCount,
          infeasibleCount: extraction.infeasibleCount,
          completenessAverage: extraction.completenessAverage,
          top10Kpis: extraction.top10,
          allFeasibleKpis: extraction.allFeasible,
          unresolvedColumns: extraction.unresolvedColumns,
          canonicalMapping: extraction.canonicalMapping,
          status: 'completed'
        }
      });

      return {
        kpiJobId: kpiJob.id,
        domain: domain,
        top10: extraction.top10,
        allFeasible: extraction.allFeasible,
        unresolvedColumns: extraction.unresolvedColumns,
        summary: {
          totalKpisInLibrary: extraction.totalKpisInLibrary,
          feasibleCount: extraction.feasibleCount,
          infeasibleCount: extraction.infeasibleCount,
          completenessAverage: extraction.completenessAverage
        }
      };

    } catch (error) {
      console.error('KPI extraction failed:', error);
      throw error;
    }
  }

  /**
   * Core extraction logic
   * @private
   */
  _extractKpisFromData(columns, rows, domain) {
    // Step 1: Resolve synonyms
    const { canonicalMapping, unresolved } = this._resolveSynonyms(columns, domain);

    // Step 2: Get KPI library for domain
    const kpiLibrary = kpiLibraries[domain] || [];

    // Filter to priority 3-5 only (as per requirements)
    const highPriorityKpis = kpiLibrary.filter(kpi => kpi.priority >= 3);

    // Step 3: Check feasibility
    const { feasible, infeasible } = this._checkFeasibility(canonicalMapping, highPriorityKpis);

    // Step 4: Rank KPIs
    const ranked = this._rankKpis(feasible, canonicalMapping, columns);

    // Step 5: Select top-10
    const top10 = ranked.slice(0, 10);

    return {
      totalKpisInLibrary: highPriorityKpis.length,
      feasibleCount: feasible.length,
      infeasibleCount: infeasible.length,
      completenessAverage: feasible.length > 0 
        ? feasible.reduce((sum, kpi) => sum + kpi.completeness, 0) / feasible.length 
        : 0,
      top10: top10,
      allFeasible: ranked,
      unresolvedColumns: unresolved,
      canonicalMapping: canonicalMapping
    };
  }

  /**
   * Resolve column synonyms
   * @private
   */
  _resolveSynonyms(datasetColumns, domain) {
    const synonymMap = synonymMaps[domain] || {};
    const canonicalMapping = {};
    const unresolved = [];

    for (const userColumn of datasetColumns) {
      const userColLower = userColumn.toLowerCase().trim();
      let found = false;

      // Check each canonical name
      for (const [canonical, aliases] of Object.entries(synonymMap)) {
        const aliasesLower = aliases.map(a => a.toLowerCase().trim());
        
        if (aliasesLower.includes(userColLower)) {
          canonicalMapping[canonical] = userColumn;
          found = true;
          break;
        }
      }

      if (!found) {
        unresolved.push(userColumn);
      }
    }

    return { canonicalMapping, unresolved };
  }

  /**
   * Check KPI feasibility (80% threshold)
   * @private
   */
  _checkFeasibility(canonicalMapping, kpiList) {
    const feasible = [];
    const infeasible = [];

    for (const kpi of kpiList) {
      const required = kpi.columns_needed || [];
      let foundCount = 0;
      const missing = [];

      for (const requiredCol of required) {
        if (canonicalMapping[requiredCol]) {
          foundCount++;
        } else {
          missing.push(requiredCol);
        }
      }

      const completeness = required.length > 0 ? foundCount / required.length : 0;

      const kpiWithMetadata = {
        ...kpi,
        completeness: completeness,
        missing_columns: missing,
        columns_mapped: {}
      };

      // Map canonical to actual columns
      for (const requiredCol of required) {
        if (canonicalMapping[requiredCol]) {
          kpiWithMetadata.columns_mapped[requiredCol] = canonicalMapping[requiredCol];
        }
      }

      if (completeness >= 0.80) {
        feasible.push(kpiWithMetadata);
      } else {
        infeasible.push(kpiWithMetadata);
      }
    }

    return { feasible, infeasible };
  }

  /**
   * Rank KPIs by priority and completeness
   * @private
   */
  _rankKpis(feasibleKpis, canonicalMapping, allColumns) {
    // Check if date column exists for recency bonus
    const hasDateColumn = allColumns.some(col => 
      col.toLowerCase().includes('date') || 
      col.toLowerCase().includes('time') ||
      canonicalMapping['order_date'] !== undefined
    );

    const scored = feasibleKpis.map(kpi => {
      // Base score: priority × (1 + completeness)
      let score = kpi.priority * (1 + kpi.completeness);

      // Recency bonus if time-based KPI and date column exists
      if (kpi.time_grain && hasDateColumn) {
        score += 0.1;
      }

      return {
        ...kpi,
        score: score,
        feasible: true
      };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Add rank
    return scored.map((kpi, index) => ({
      ...kpi,
      rank: index + 1
    }));
  }

  /**
   * Select KPIs for dashboard
   */
  async selectKpis(kpiJobId, selectedKpiIds) {
    try {
      const kpiJob = await prisma.kpiExtractionJob.findUnique({
        where: { id: kpiJobId }
      });

      if (!kpiJob) {
        throw new Error('KPI extraction job not found');
      }

      // Save selected KPIs
      for (const kpiId of selectedKpiIds) {
        const kpiDef = kpiJob.allFeasibleKpis.find(k => k.kpi_id === kpiId);
        
        if (kpiDef) {
          await prisma.selectedKpi.create({
            data: {
              id: uuidv4(),
              kpiJobId: kpiJobId,
              kpiId: kpiDef.kpi_id,
              name: kpiDef.name,
              formula: kpiDef.formula_expr,
              requiredColumns: kpiDef.columns_needed,
              mappedColumns: kpiDef.columns_mapped,
              priority: kpiDef.priority,
              category: kpiDef.category
            }
          });
        }
      }

      // Update job status
      await prisma.kpiExtractionJob.update({
        where: { id: kpiJobId },
        data: { status: 'confirmed' }
      });

      return {
        status: 'confirmed',
        kpiJobId: kpiJobId,
        selectedCount: selectedKpiIds.length,
        nextStep: 'module_5_dashboard_creation'
      };

    } catch (error) {
      console.error('KPI selection failed:', error);
      throw error;
    }
  }

  /**
   * Get KPI library for domain
   */
  getKpiLibrary(domain) {
    const library = kpiLibraries[domain] || [];
    
    // Filter to priority 3-5 only
    return library.filter(kpi => kpi.priority >= 3);
  }

  /**
   * Get KPI job status
   */
  async getKpiJobStatus(kpiJobId) {
    const kpiJob = await prisma.kpiExtractionJob.findUnique({
      where: { id: kpiJobId },
      include: {
        selectedKpis: true
      }
    });

    if (!kpiJob) {
      throw new Error('KPI extraction job not found');
    }

    return kpiJob;
  }

  /**
   * Default KPI library (inline fallback)
   * @private
   */
  getDefaultKpiLibrary(domain) {
    const libraries = {
      retail: [
        {
          kpi_id: 'retail_revenue_001',
          domain: 'retail',
          name: 'Total Revenue',
          category: 'Financial',
          priority: 5,
          formula_expr: 'SUM(order_value)',
          columns_needed: ['order_value'],
          time_grain: 'day',
          aggregation_type: 'sum',
          description: 'Total revenue from all transactions',
          unit: 'currency'
        },
        {
          kpi_id: 'retail_units_001',
          domain: 'retail',
          name: 'Units Sold',
          category: 'Sales',
          priority: 5,
          formula_expr: 'SUM(quantity)',
          columns_needed: ['quantity'],
          time_grain: 'day',
          aggregation_type: 'sum',
          description: 'Total units sold',
          unit: 'count'
        },
        {
          kpi_id: 'retail_aov_001',
          domain: 'retail',
          name: 'Average Order Value',
          category: 'Financial',
          priority: 4,
          formula_expr: 'AVG(order_value)',
          columns_needed: ['order_value'],
          time_grain: 'day',
          aggregation_type: 'avg',
          description: 'Average value per order',
          unit: 'currency'
        },
        {
          kpi_id: 'retail_orders_001',
          domain: 'retail',
          name: 'Orders Count',
          category: 'Sales',
          priority: 5,
          formula_expr: 'COUNT_DISTINCT(order_id)',
          columns_needed: ['order_id'],
          time_grain: 'day',
          aggregation_type: 'count',
          description: 'Total number of orders',
          unit: 'count'
        },
        {
          kpi_id: 'retail_customers_001',
          domain: 'retail',
          name: 'Customers Count',
          category: 'Sales',
          priority: 4,
          formula_expr: 'COUNT_DISTINCT(customer_id)',
          columns_needed: ['customer_id'],
          time_grain: 'day',
          aggregation_type: 'count',
          description: 'Total unique customers',
          unit: 'count'
        },
        {
          kpi_id: 'retail_profit_001',
          domain: 'retail',
          name: 'Gross Profit',
          category: 'Financial',
          priority: 4,
          formula_expr: 'SUM(order_value - product_cost)',
          columns_needed: ['order_value', 'product_cost'],
          time_grain: 'day',
          aggregation_type: 'sum',
          description: 'Total profit before expenses',
          unit: 'currency'
        },
        {
          kpi_id: 'retail_margin_001',
          domain: 'retail',
          name: 'Gross Margin %',
          category: 'Financial',
          priority: 4,
          formula_expr: '(SUM(order_value - product_cost) / SUM(order_value)) * 100',
          columns_needed: ['order_value', 'product_cost'],
          time_grain: 'day',
          aggregation_type: 'ratio',
          description: 'Profit margin percentage',
          unit: 'percent'
        },
        {
          kpi_id: 'retail_inventory_001',
          domain: 'retail',
          name: 'Inventory Turnover',
          category: 'Operations',
          priority: 4,
          formula_expr: 'SUM(cogs) / AVG(inventory)',
          columns_needed: ['cogs', 'inventory'],
          time_grain: 'month',
          aggregation_type: 'ratio',
          description: 'Rate of inventory sold and replaced',
          unit: 'ratio'
        },
        {
          kpi_id: 'retail_repeat_001',
          domain: 'retail',
          name: 'Repeat Purchase Rate',
          category: 'Sales',
          priority: 4,
          formula_expr: 'COUNT_DISTINCT(customers_with_2+_orders) / COUNT_DISTINCT(all_customers)',
          columns_needed: ['customer_id', 'order_id'],
          time_grain: 'month',
          aggregation_type: 'ratio',
          description: 'Percentage of repeat customers',
          unit: 'percent'
        },
        {
          kpi_id: 'retail_category_001',
          domain: 'retail',
          name: 'Sales by Category',
          category: 'Sales',
          priority: 3,
          formula_expr: 'SUM(order_value) BY category',
          columns_needed: ['order_value', 'category'],
          time_grain: 'day',
          aggregation_type: 'sum',
          description: 'Revenue breakdown by product category',
          unit: 'currency'
        }
      ],
      saas: [
        {
          kpi_id: 'saas_mrr_001',
          domain: 'saas',
          name: 'Monthly Recurring Revenue (MRR)',
          category: 'Core Metrics',
          priority: 5,
          formula_expr: 'SUM(subscription_value WHERE status=active)',
          columns_needed: ['subscription_value', 'status'],
          time_grain: 'month',
          aggregation_type: 'sum',
          description: 'Total monthly recurring revenue',
          unit: 'currency'
        },
        {
          kpi_id: 'saas_arr_001',
          domain: 'saas',
          name: 'Annual Recurring Revenue (ARR)',
          category: 'Core Metrics',
          priority: 5,
          formula_expr: 'MRR * 12',
          columns_needed: ['subscription_value', 'status'],
          time_grain: 'year',
          aggregation_type: 'derived',
          description: 'Annualized recurring revenue',
          unit: 'currency'
        },
        {
          kpi_id: 'saas_churn_001',
          domain: 'saas',
          name: 'Churn Rate %',
          category: 'Core Metrics',
          priority: 5,
          formula_expr: '(COUNT(churned) / COUNT(active_start)) * 100',
          columns_needed: ['churn', 'customer_id'],
          time_grain: 'month',
          aggregation_type: 'ratio',
          description: 'Monthly customer churn rate',
          unit: 'percent'
        },
        {
          kpi_id: 'saas_arpa_001',
          domain: 'saas',
          name: 'Average Revenue Per Account (ARPA)',
          category: 'Core Metrics',
          priority: 4,
          formula_expr: 'MRR / COUNT_DISTINCT(customer_id)',
          columns_needed: ['subscription_value', 'customer_id'],
          time_grain: 'month',
          aggregation_type: 'avg',
          description: 'Average revenue per customer',
          unit: 'currency'
        },
        {
          kpi_id: 'saas_new_mrr_001',
          domain: 'saas',
          name: 'New MRR',
          category: 'Growth',
          priority: 4,
          formula_expr: 'SUM(subscription_value WHERE signup_date IN period)',
          columns_needed: ['subscription_value', 'signup_date'],
          time_grain: 'month',
          aggregation_type: 'sum',
          description: 'MRR from new customers',
          unit: 'currency'
        },
        {
          kpi_id: 'saas_expansion_001',
          domain: 'saas',
          name: 'Expansion MRR',
          category: 'Growth',
          priority: 4,
          formula_expr: 'SUM(upsell_value + addon_value)',
          columns_needed: ['subscription_value', 'plan'],
          time_grain: 'month',
          aggregation_type: 'sum',
          description: 'MRR from upsells and expansions',
          unit: 'currency'
        },
        {
          kpi_id: 'saas_ltv_001',
          domain: 'saas',
          name: 'Customer Lifetime Value (LTV)',
          category: 'Core Metrics',
          priority: 4,
          formula_expr: 'AVG(customer_total_revenue)',
          columns_needed: ['subscription_value', 'customer_id'],
          time_grain: 'year',
          aggregation_type: 'avg',
          description: 'Average lifetime value per customer',
          unit: 'currency'
        },
        {
          kpi_id: 'saas_cac_001',
          domain: 'saas',
          name: 'Customer Acquisition Cost (CAC)',
          category: 'Core Metrics',
          priority: 3,
          formula_expr: 'SUM(sales_marketing_spend) / COUNT(new_customers)',
          columns_needed: ['cac', 'customer_id'],
          time_grain: 'month',
          aggregation_type: 'avg',
          description: 'Cost to acquire new customer',
          unit: 'currency'
        },
        {
          kpi_id: 'saas_active_users_001',
          domain: 'saas',
          name: 'Active Users (MAU)',
          category: 'Engagement',
          priority: 3,
          formula_expr: 'COUNT_DISTINCT(user_id WHERE activity IN period)',
          columns_needed: ['customer_id', 'subscription_value'],
          time_grain: 'month',
          aggregation_type: 'count',
          description: 'Monthly active users',
          unit: 'count'
        },
        {
          kpi_id: 'saas_nrr_001',
          domain: 'saas',
          name: 'Net Revenue Retention (NRR)',
          category: 'Growth',
          priority: 4,
          formula_expr: '((mrr_start + expansion - churn) / mrr_start) * 100',
          columns_needed: ['subscription_value', 'churn'],
          time_grain: 'month',
          aggregation_type: 'ratio',
          description: 'Revenue retention including expansions',
          unit: 'percent'
        }
      ],
      // Add minimal defaults for other domains
      ecommerce: [],
      healthcare: [],
      manufacturing: [],
      logistics: [],
      financial: [],
      education: []
    };

    return libraries[domain] || [];
  }

  /**
   * Default synonym map (inline fallback)
   * @private
   */
  getDefaultSynonymMap(domain) {
    const maps = {
      retail: {
        order_value: ['total sale', 'amount', 'revenue', 'net_revenue', 'order_total', 'transaction_amount', 'sales', 'sale_amount'],
        quantity: ['qty', 'units', 'units_sold', 'quantity_ordered', 'item_count', 'count'],
        order_id: ['order id', 'orderno', 'order_no', 'transaction_id', 'txn_id', 'sale_id'],
        customer_id: ['customer id', 'customerid', 'cust_id', 'customer_number'],
        product_cost: ['cost', 'cogs', 'product_cost', 'unit_cost'],
        category: ['product_category', 'type', 'category', 'product_type'],
        order_date: ['date', 'order_date', 'transaction_date', 'sale_date']
      },
      saas: {
        subscription_value: ['mrr', 'arr', 'subscription_value', 'monthly_revenue', 'subscription_amount'],
        customer_id: ['customer id', 'customerid', 'account_id', 'user_id'],
        subscription_id: ['subscription id', 'subscription_id', 'sub_id'],
        status: ['status', 'subscription_status', 'account_status'],
        churn: ['churn', 'churned', 'cancelled', 'cancellation'],
        signup_date: ['signup_date', 'created_at', 'start_date', 'subscription_start'],
        plan: ['plan', 'tier', 'subscription_plan', 'package'],
        cac: ['cac', 'customer_acquisition_cost', 'acquisition_cost']
      },
      ecommerce: {},
      healthcare: {},
      manufacturing: {},
      logistics: {},
      financial: {},
      education: {}
    };

    return maps[domain] || {};
  }
}

export default new KpiExtractionService();
