/**
 * KPI Extraction Service (Module 4)
 * Rule-Based KPI Identification and Ranking
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/database.js';

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
          upload: true
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
          projectId: cleaningJob.projectId,
          domainJobId: domainJobId,
          cleaningJobIds: [cleaningJobId], // Store as array for schema compatibility
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
        totalKpisInLibrary: extraction.totalKpisInLibrary,
        feasibleCount: extraction.feasibleCount,
        infeasibleCount: extraction.infeasibleCount,
        completenessAverage: extraction.completenessAverage,
        top10Kpis: extraction.top10,
        allFeasibleKpis: extraction.allFeasible,
        allKpis: extraction.allKpis, // Complete list with auto/manual recommendations
        autoSelectedIds: extraction.autoSelectedIds,
        unresolvedColumns: extraction.unresolvedColumns,
        canonicalMapping: extraction.canonicalMapping
      };

    } catch (error) {
      console.error('KPI extraction failed:', error);
      throw error;
    }
  }

  /**
   * Extract KPIs from unified view (for multi-file projects)
   */
  async extractKPIsFromView(viewName, domain, projectId, domainJobId) {
    try {
      console.log(`[KPI Extraction] Extracting from unified view: ${viewName}`);
      console.log(`[KPI Extraction] Domain: ${domain}, Project: ${projectId}`);

      // Query the unified view to get columns and sample data
      const columnsResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [viewName]);

      if (columnsResult.rows.length === 0) {
        throw new Error(`View ${viewName} not found or has no columns`);
      }

      const columns = columnsResult.rows.map(r => r.column_name);
      console.log(`[KPI Extraction] View columns (${columns.length}):`, columns);

      // Get sample data from the view (limit to avoid memory issues)
      const dataResult = await pool.query(`SELECT * FROM "${viewName}" LIMIT 1000`);
      const rows = dataResult.rows;
      console.log(`[KPI Extraction] Retrieved ${rows.length} rows from view`);

      // Extract KPIs using the core logic
      const extraction = this._extractKpisFromData(columns, rows, domain);

      // Create KPI extraction job
      const kpiJob = await prisma.kpiExtractionJob.create({
        data: {
          id: uuidv4(),
          projectId: projectId,
          domainJobId: domainJobId,
          cleaningJobIds: [],
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

      console.log(`[KPI Extraction] Created job ${kpiJob.id} with ${extraction.feasibleCount} feasible KPIs`);

      return {
        kpiJobId: kpiJob.id,
        domain: domain,
        totalKpisInLibrary: extraction.totalKpisInLibrary,
        feasibleCount: extraction.feasibleCount,
        infeasibleCount: extraction.infeasibleCount,
        completenessAverage: extraction.completenessAverage,
        top10Kpis: extraction.top10,
        allFeasibleKpis: extraction.allFeasible,
        allKpis: extraction.allKpis,
        autoSelectedIds: extraction.autoSelectedIds,
        unresolvedColumns: extraction.unresolvedColumns,
        canonicalMapping: extraction.canonicalMapping
      };

    } catch (error) {
      console.error('[KPI Extraction] Failed:', error);
      throw error;
    }
  }

  /**
   * Core extraction logic
   * @private
   */
  _extractKpisFromData(columns, rows, domain) {
    console.log(`[KPI Extraction] Starting for domain: ${domain}`);
    console.log(`[KPI Extraction] Dataset columns (${columns.length}):`, columns);

    // Step 1: Resolve synonyms
    const { canonicalMapping, unresolved } = this._resolveSynonyms(columns, domain);
    console.log(`[KPI Extraction] Resolved ${Object.keys(canonicalMapping).length} columns`);
    console.log('[KPI Extraction] Canonical mapping:', canonicalMapping);
    console.log('[KPI Extraction] Unresolved columns:', unresolved);

    // Step 2: Get KPI library for domain
    const kpiLibrary = kpiLibraries[domain] || [];
    console.log(`[KPI Extraction] Total KPIs in library: ${kpiLibrary.length}`);

    // Filter to priority 3-5 only (as per requirements)
    const highPriorityKpis = kpiLibrary.filter(kpi => kpi.priority >= 3);
    console.log(`[KPI Extraction] High priority KPIs (3-5): ${highPriorityKpis.length}`);

    // Step 3: Check feasibility for ALL KPIs
    const { feasible, infeasible } = this._checkFeasibility(canonicalMapping, highPriorityKpis);
    console.log(`[KPI Extraction] Feasible: ${feasible.length}, Infeasible: ${infeasible.length}`);

    // Step 4: Rank feasible KPIs
    const ranked = this._rankKpis(feasible, canonicalMapping, columns);

    // Step 5: AUTO-SELECT ALL FEASIBLE KPIs (changed from top-10 only)
    const autoSelected = ranked; // Select ALL feasible KPIs
    console.log(`[KPI Extraction] Auto-selected ALL ${autoSelected.length} feasible KPIs`);

    // Step 6: All feasible KPIs are now auto-selected
    const recommended = ranked.map(kpi => ({ ...kpi, autoSelected: true, reason: 'Feasible with available data' }));
    
    // Add infeasible KPIs with reasons
    const infeasibleWithReasons = infeasible.map(kpi => ({
      ...kpi,
      feasible: false,
      autoSelected: false,
      reason: `Missing data: ${kpi.missing_columns.join(', ')}`
    }));

    const allKpis = [...recommended, ...infeasibleWithReasons];

    return {
      totalKpisInLibrary: highPriorityKpis.length,
      feasibleCount: feasible.length,
      infeasibleCount: infeasible.length,
      completenessAverage: feasible.length > 0 
        ? feasible.reduce((sum, kpi) => sum + kpi.completeness, 0) / feasible.length 
        : 0,
      top10: autoSelected,
      allFeasible: ranked,
      allKpis: allKpis, // Complete list with recommendations
      autoSelectedIds: autoSelected.map(kpi => kpi.kpi_id),
      unresolvedColumns: unresolved,
      canonicalMapping: canonicalMapping
    };
  }

  /**
   * Resolve column synonyms
   * Enhanced algorithm with flexible matching
   * @private
   */
  _resolveSynonyms(datasetColumns, domain) {
    const synonymMap = synonymMaps[domain] || {};
    const canonicalMapping = {};
    const unresolved = [];

    // Helper: Normalize column name for matching
    const normalize = (str) => {
      return str
        .toLowerCase()
        .trim()
        .replace(/[_\s-]+/g, '') // Remove separators
        .replace(/[^a-z0-9]/g, ''); // Remove special chars
    };

    for (const userColumn of datasetColumns) {
      const userColNormalized = normalize(userColumn);
      const userColLower = userColumn.toLowerCase().trim();
      let found = false;

      // Step 1: Check if user column matches canonical name directly
      for (const canonical of Object.keys(synonymMap)) {
        if (normalize(canonical) === userColNormalized) {
          canonicalMapping[canonical] = userColumn;
          found = true;
          break;
        }
      }

      if (found) continue;

      // Step 2: Check against synonym aliases
      for (const [canonical, aliases] of Object.entries(synonymMap)) {
        for (const alias of aliases) {
          const aliasNormalized = normalize(alias);
          
          // Exact match after normalization
          if (aliasNormalized === userColNormalized) {
            canonicalMapping[canonical] = userColumn;
            found = true;
            break;
          }
          
          // Partial match (contains)
          if (!found && aliasNormalized.length > 3 && userColNormalized.includes(aliasNormalized)) {
            canonicalMapping[canonical] = userColumn;
            found = true;
            break;
          }
          
          // Reverse partial match
          if (!found && userColNormalized.length > 3 && aliasNormalized.includes(userColNormalized)) {
            canonicalMapping[canonical] = userColumn;
            found = true;
            break;
          }
        }
        if (found) break;
      }

      // Step 3: Common generic columns (date, id, name)
      if (!found) {
        if (userColNormalized.includes('date') || userColNormalized.includes('time')) {
          if (!canonicalMapping['order_date'] && domain === 'retail') {
            canonicalMapping['order_date'] = userColumn;
            found = true;
          } else if (!canonicalMapping['signup_date'] && domain === 'saas') {
            canonicalMapping['signup_date'] = userColumn;
            found = true;
          }
        } else if (userColNormalized.includes('id') && userColNormalized.includes('order')) {
          if (!canonicalMapping['order_id']) {
            canonicalMapping['order_id'] = userColumn;
            found = true;
          }
        } else if (userColNormalized.includes('id') && userColNormalized.includes('customer')) {
          if (!canonicalMapping['customer_id']) {
            canonicalMapping['customer_id'] = userColumn;
            found = true;
          }
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
      const available = [];

      for (const requiredCol of required) {
        if (canonicalMapping[requiredCol]) {
          foundCount++;
          available.push(requiredCol);
        } else {
          missing.push(requiredCol);
        }
      }

      const completeness = required.length > 0 ? foundCount / required.length : 0;

      const kpiWithMetadata = {
        ...kpi,
        completeness: parseFloat(completeness.toFixed(4)),
        available_columns: available,
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
   * Formula: score = priority × (1 + completeness) + recency_bonus
   * @private
   */
  _rankKpis(feasibleKpis, canonicalMapping, allColumns) {
    // Enhanced date/time column detection
    const hasDateColumn = allColumns.some(col => {
      const colLower = col.toLowerCase();
      return colLower.includes('date') || 
             colLower.includes('time') || 
             colLower.includes('timestamp') ||
             colLower.includes('created') ||
             colLower.includes('updated');
    }) || Object.keys(canonicalMapping).some(key => 
      key.includes('date') || key.includes('time') || key.includes('timestamp')
    );

    const scored = feasibleKpis.map(kpi => {
      // Base score: priority × (1 + completeness)
      const priorityWeight = kpi.priority || 3; // Default to medium if missing
      let score = priorityWeight * (1 + kpi.completeness);

      // Recency bonus: +0.1 if KPI uses time dimension and date exists
      const requiresDate = kpi.time_grain !== undefined || 
                          (kpi.columns_needed && kpi.columns_needed.some(col => 
                            col.includes('date') || col.includes('time')
                          ));
      
      if (requiresDate && hasDateColumn) {
        score += 0.1;
      }

      return {
        ...kpi,
        score: parseFloat(score.toFixed(2)),
        has_date_column: hasDateColumn,
        requires_date: requiresDate,
        feasible: true
      };
    });

    // Multi-level sorting: score (primary), priority (secondary), completeness (tertiary)
    scored.sort((a, b) => {
      if (Math.abs(b.score - a.score) > 0.01) return b.score - a.score;
      if (b.priority !== a.priority) return b.priority - a.priority;
      return b.completeness - a.completeness;
    });

    // Add rank
    return scored.map((kpi, index) => ({
      ...kpi,
      rank: index + 1
    }));
  }

  /**
   * Select KPIs for dashboard
   */
  async selectKpis(kpiJobId, selectedKpiIds, manualKpis = []) {
    try {
      const kpiJob = await prisma.kpiExtractionJob.findUnique({
        where: { id: kpiJobId }
      });

      if (!kpiJob) {
        throw new Error('KPI extraction job not found');
      }

      // Delete existing selected KPIs to avoid duplicates
      await prisma.selectedKpi.deleteMany({
        where: { kpiJobId: kpiJobId }
      });

      // Save auto-detected selected KPIs
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
      
      // Save manual KPIs
      if (manualKpis && manualKpis.length > 0) {
        for (const mkpi of manualKpis) {
          await prisma.selectedKpi.create({
            data: {
              id: mkpi.id || uuidv4(),
              kpiJobId: kpiJobId,
              kpiId: mkpi.id || `manual_${uuidv4()}`,
              name: mkpi.name,
              formula: `Manual KPI: ${mkpi.name}`,
              requiredColumns: JSON.stringify([mkpi.column]),
              mappedColumns: JSON.stringify({ [mkpi.column]: mkpi.column }),
              priority: 3,
              category: 'Custom'
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
        manualKpiCount: manualKpis?.length || 0,
        totalKpiCount: selectedKpiIds.length + (manualKpis?.length || 0),
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
        // Core Revenue Metrics
        {
          kpi_id: 'retail_revenue_001',
          domain: 'retail',
          name: 'Total Revenue',
          category: 'Financial',
          priority: 5,
          formula_expr: 'SUM(total_amount)',
          columns_needed: ['total_amount'],
          time_grain: 'day',
          aggregation_type: 'sum',
          description: 'Total revenue from all transactions',
          unit: 'currency'
        },
        {
          kpi_id: 'retail_profit_001',
          domain: 'retail',
          name: 'Total Profit',
          category: 'Financial',
          priority: 5,
          formula_expr: 'SUM(profit)',
          columns_needed: ['profit'],
          time_grain: 'day',
          aggregation_type: 'sum',
          description: 'Total profit from all sales',
          unit: 'currency'
        },
        {
          kpi_id: 'retail_margin_001',
          domain: 'retail',
          name: 'Gross Margin %',
          category: 'Financial',
          priority: 5,
          formula_expr: '(SUM(profit) / SUM(total_amount)) * 100',
          columns_needed: ['profit', 'total_amount'],
          time_grain: 'day',
          aggregation_type: 'ratio',
          description: 'Profit margin percentage',
          unit: 'percent'
        },
        {
          kpi_id: 'retail_aov_001',
          domain: 'retail',
          name: 'Average Order Value',
          category: 'Financial',
          priority: 5,
          formula_expr: 'AVG(total_amount)',
          columns_needed: ['total_amount'],
          time_grain: 'day',
          aggregation_type: 'avg',
          description: 'Average value per order',
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
          kpi_id: 'retail_orders_001',
          domain: 'retail',
          name: 'Total Orders',
          category: 'Sales',
          priority: 5,
          formula_expr: 'COUNT_DISTINCT(sale_id)',
          columns_needed: ['sale_id'],
          time_grain: 'day',
          aggregation_type: 'count',
          description: 'Total number of orders',
          unit: 'count'
        },
        
        // Customer Metrics
        {
          kpi_id: 'retail_clv_001',
          domain: 'retail',
          name: 'Customer Lifetime Value',
          category: 'Customer',
          priority: 5,
          formula_expr: 'AVG(lifetime_value)',
          columns_needed: ['lifetime_value'],
          time_grain: 'month',
          aggregation_type: 'avg',
          description: 'Average customer lifetime value',
          unit: 'currency'
        },
        {
          kpi_id: 'retail_cac_001',
          domain: 'retail',
          name: 'Customer Acquisition Cost',
          category: 'Customer',
          priority: 5,
          formula_expr: 'AVG(acquisition_cost)',
          columns_needed: ['acquisition_cost'],
          time_grain: 'month',
          aggregation_type: 'avg',
          description: 'Average cost to acquire a customer',
          unit: 'currency'
        },
        {
          kpi_id: 'retail_clv_cac_001',
          domain: 'retail',
          name: 'CLV to CAC Ratio',
          category: 'Customer',
          priority: 5,
          formula_expr: 'AVG(lifetime_value) / AVG(acquisition_cost)',
          columns_needed: ['lifetime_value', 'acquisition_cost'],
          time_grain: 'month',
          aggregation_type: 'ratio',
          description: 'Return on customer acquisition investment',
          unit: 'ratio'
        },
        {
          kpi_id: 'retail_active_customers_001',
          domain: 'retail',
          name: 'Active Customers',
          category: 'Customer',
          priority: 4,
          formula_expr: 'COUNT_DISTINCT(customer_id WHERE status=active)',
          columns_needed: ['customer_id', 'status'],
          time_grain: 'day',
          aggregation_type: 'count',
          description: 'Number of active customers',
          unit: 'count'
        },
        {
          kpi_id: 'retail_churn_001',
          domain: 'retail',
          name: 'Customer Churn Rate',
          category: 'Customer',
          priority: 4,
          formula_expr: '(COUNT(status=churned) / COUNT(customer_id)) * 100',
          columns_needed: ['status', 'customer_id'],
          time_grain: 'month',
          aggregation_type: 'ratio',
          description: 'Percentage of customers churned',
          unit: 'percent'
        },
        {
          kpi_id: 'retail_customers_001',
          domain: 'retail',
          name: 'Total Customers',
          category: 'Customer',
          priority: 4,
          formula_expr: 'COUNT_DISTINCT(customer_id)',
          columns_needed: ['customer_id'],
          time_grain: 'day',
          aggregation_type: 'count',
          description: 'Total unique customers',
          unit: 'count'
        },
        
        // Product Metrics
        {
          kpi_id: 'retail_category_revenue_001',
          domain: 'retail',
          name: 'Revenue by Category',
          category: 'Product',
          priority: 4,
          formula_expr: 'SUM(total_amount) BY category',
          columns_needed: ['total_amount', 'category'],
          time_grain: 'day',
          aggregation_type: 'sum',
          description: 'Revenue breakdown by product category',
          unit: 'currency'
        },
        {
          kpi_id: 'retail_category_profit_001',
          domain: 'retail',
          name: 'Profit by Category',
          category: 'Product',
          priority: 4,
          formula_expr: 'SUM(profit) BY category',
          columns_needed: ['profit', 'category'],
          time_grain: 'day',
          aggregation_type: 'sum',
          description: 'Profit breakdown by product category',
          unit: 'currency'
        },
        {
          kpi_id: 'retail_product_margin_001',
          domain: 'retail',
          name: 'Average Product Margin',
          category: 'Product',
          priority: 4,
          formula_expr: 'AVG(margin_percent)',
          columns_needed: ['margin_percent'],
          time_grain: 'day',
          aggregation_type: 'avg',
          description: 'Average profit margin across products',
          unit: 'percent'
        },
        {
          kpi_id: 'retail_top_products_001',
          domain: 'retail',
          name: 'Top Products by Revenue',
          category: 'Product',
          priority: 4,
          formula_expr: 'SUM(total_amount) BY product_id ORDER BY DESC LIMIT 10',
          columns_needed: ['total_amount', 'product_id'],
          time_grain: 'day',
          aggregation_type: 'sum',
          description: 'Top 10 products by revenue',
          unit: 'currency'
        },
        
        // Operational Metrics
        {
          kpi_id: 'retail_return_rate_001',
          domain: 'retail',
          name: 'Return Rate',
          category: 'Operations',
          priority: 4,
          formula_expr: '(COUNT(returned=yes) / COUNT(sale_id)) * 100',
          columns_needed: ['returned', 'sale_id'],
          time_grain: 'day',
          aggregation_type: 'ratio',
          description: 'Percentage of orders returned',
          unit: 'percent'
        },
        {
          kpi_id: 'retail_discounts_001',
          domain: 'retail',
          name: 'Total Discounts Given',
          category: 'Operations',
          priority: 3,
          formula_expr: 'SUM(discount_amount)',
          columns_needed: ['discount_amount'],
          time_grain: 'day',
          aggregation_type: 'sum',
          description: 'Total discount amount given',
          unit: 'currency'
        },
        {
          kpi_id: 'retail_shipping_001',
          domain: 'retail',
          name: 'Average Shipping Cost',
          category: 'Operations',
          priority: 3,
          formula_expr: 'AVG(shipping_cost)',
          columns_needed: ['shipping_cost'],
          time_grain: 'day',
          aggregation_type: 'avg',
          description: 'Average shipping cost per order',
          unit: 'currency'
        },
        {
          kpi_id: 'retail_payment_method_001',
          domain: 'retail',
          name: 'Sales by Payment Method',
          category: 'Operations',
          priority: 3,
          formula_expr: 'COUNT(sale_id) BY payment_method',
          columns_needed: ['sale_id', 'payment_method'],
          time_grain: 'day',
          aggregation_type: 'count',
          description: 'Order distribution by payment method',
          unit: 'count'
        },
        
        // Segment Analysis
        {
          kpi_id: 'retail_segment_revenue_001',
          domain: 'retail',
          name: 'Revenue by Customer Segment',
          category: 'Customer',
          priority: 4,
          formula_expr: 'SUM(total_amount) BY segment',
          columns_needed: ['total_amount', 'segment'],
          time_grain: 'day',
          aggregation_type: 'sum',
          description: 'Revenue by customer segment',
          unit: 'currency'
        },
        {
          kpi_id: 'retail_country_revenue_001',
          domain: 'retail',
          name: 'Revenue by Country',
          category: 'Geographic',
          priority: 3,
          formula_expr: 'SUM(total_amount) BY country',
          columns_needed: ['total_amount', 'country'],
          time_grain: 'day',
          aggregation_type: 'sum',
          description: 'Revenue by country',
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
        total_amount: ['total_amount', 'order_value', 'total sale', 'amount', 'revenue', 'net_revenue', 'order_total', 'transaction_amount', 'sales', 'sale_amount'],
        profit: ['profit', 'gross_profit', 'net_profit', 'profit_amount'],
        cost_amount: ['cost_amount', 'total_cost', 'cogs', 'cost_of_goods'],
        quantity: ['quantity', 'qty', 'units', 'units_sold', 'quantity_ordered', 'item_count', 'count'],
        sale_id: ['sale_id', 'order_id', 'orderno', 'order_no', 'transaction_id', 'txn_id'],
        customer_id: ['customer_id', 'customerid', 'cust_id', 'customer_number'],
        product_id: ['product_id', 'productid', 'prod_id', 'item_id'],
        category: ['category', 'product_category', 'type', 'product_type'],
        sale_date: ['sale_date', 'order_date', 'date', 'transaction_date'],
        unit_price: ['unit_price', 'price', 'item_price'],
        status: ['status', 'order_status', 'sale_status'],
        payment_method: ['payment_method', 'payment_type', 'payment'],
        shipping_cost: ['shipping_cost', 'shipping', 'delivery_cost'],
        discount_amount: ['discount_amount', 'discount', 'discount_value'],
        returned: ['returned', 'return_status', 'is_returned'],
        lifetime_value: ['lifetime_value', 'ltv', 'clv', 'customer_value'],
        acquisition_cost: ['acquisition_cost', 'cac', 'customer_acquisition_cost'],
        segment: ['segment', 'customer_segment', 'customer_type'],
        country: ['country', 'location', 'region'],
        margin_percent: ['margin_percent', 'profit_margin', 'margin']
      },
      ecommerce: {
        total_amount: ['total_amount', 'order_value', 'revenue', 'sales'],
        profit: ['profit', 'gross_profit'],
        quantity: ['quantity', 'qty', 'units'],
        sale_id: ['sale_id', 'order_id'],
        customer_id: ['customer_id'],
        product_id: ['product_id'],
        category: ['category'],
        lifetime_value: ['lifetime_value', 'ltv', 'clv'],
        acquisition_cost: ['acquisition_cost', 'cac']
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
