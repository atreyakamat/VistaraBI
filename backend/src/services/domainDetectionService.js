/**
 * Domain Detection Service (Module 3)
 * Rule-Based Domain Classification with Confidence Scoring
 * Blueprint: VistaraBI Module 3 - Smart Rule-Based Approach
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

class DomainDetectionService {
  constructor() {
    // Define signature columns and comprehensive keyword library for each domain
    // Per blueprint: Every domain has 2-3 "signature" columns for 95% confidence
    this.domainSignatures = {
      retail: {
        primaryColumns: ['product_id', 'sku', 'category', 'inventory', 'units_sold'],
        secondaryColumns: ['price', 'revenue', 'discount', 'brand', 'supplier', 'stock', 'product_name', 'item'],
        keywords: {
          product: ['product_id', 'product_name', 'sku', 'item', 'product'],
          category: ['category', 'product_category', 'type', 'classification'],
          inventory: ['inventory', 'stock', 'units_in_stock', 'qty_on_hand', 'stock_level'],
          sales: ['revenue', 'sales', 'units_sold', 'quantity_sold', 'amount'],
          pricing: ['price', 'unit_price', 'mrp', 'selling_price', 'cost']
        },
        weight: 1.0
      },
      ecommerce: {
        primaryColumns: ['customer_id', 'order_id', 'shipping_address', 'delivery_date', 'payment_method'],
        secondaryColumns: ['payment_method', 'order_value', 'tracking_number', 'cart', 'order_status', 'delivery_status'],
        keywords: {
          order: ['order_id', 'order_no', 'transaction_id', 'order'],
          customer: ['customer_id', 'user_id', 'buyer_id', 'customer'],
          shipping: ['shipping_address', 'delivery_address', 'destination', 'ship_to'],
          delivery: ['delivery_date', 'shipped_date', 'tracking_number', 'delivery', 'shipment'],
          payment: ['payment_method', 'payment_type', 'card_type', 'payment']
        },
        weight: 1.0
      },
      saas: {
        primaryColumns: ['subscription_id', 'mrr', 'arr', 'churn', 'customer_id', 'tier'],
        secondaryColumns: ['tier', 'signup_date', 'ltv', 'cac', 'plan', 'monthly_revenue', 'annual_revenue'],
        keywords: {
          subscription: ['subscription_id', 'sub_id', 'plan_id', 'subscription'],
          revenue: ['mrr', 'arr', 'monthly_revenue', 'annual_revenue', 'recurring'],
          customer: ['customer_id', 'account_id', 'user_id', 'customer'],
          churn: ['churn', 'churn_flag', 'is_churned', 'churned'],
          tier: ['tier', 'plan', 'pricing_tier', 'plan_type', 'subscription_level']
        },
        weight: 1.0
      },
      healthcare: {
        primaryColumns: ['patient_id', 'diagnosis', 'provider_id', 'visit_date', 'treatment_type'],
        secondaryColumns: ['treatment_type', 'outcome', 'cost', 'appointment', 'medication', 'procedure'],
        keywords: {
          patient: ['patient_id', 'patient_name', 'patient_no', 'patient'],
          diagnosis: ['diagnosis', 'disease', 'condition', 'icd_code', 'medical_condition'],
          provider: ['provider_id', 'doctor_id', 'physician_id', 'provider', 'doctor'],
          visit: ['visit_date', 'appointment_date', 'visit_type', 'appointment'],
          treatment: ['treatment', 'medication', 'procedure', 'therapy', 'treatment_type']
        },
        weight: 1.0
      },
      manufacturing: {
        primaryColumns: ['factory_id', 'production_qty', 'defect_rate', 'supplier_id', 'machine_id'],
        secondaryColumns: ['machine_id', 'batch_id', 'quality_score', 'output', 'defects', 'rejection_rate'],
        keywords: {
          production: ['production_qty', 'units_produced', 'output', 'production', 'manufactured'],
          quality: ['defect_rate', 'defects', 'quality_score', 'rejection_rate', 'defect'],
          facility: ['factory_id', 'plant_id', 'facility_id', 'factory', 'plant'],
          supplier: ['supplier_id', 'vendor_id', 'supplier_name', 'supplier', 'vendor'],
          machine: ['machine_id', 'equipment_id', 'line_no', 'machine', 'equipment']
        },
        weight: 1.0
      },
      logistics: {
        primaryColumns: ['shipment_id', 'tracking_number', 'delivery_date', 'origin', 'destination'],
        secondaryColumns: ['destination', 'status', 'cost', 'warehouse', 'hub', 'delivery_status'],
        keywords: {
          shipment: ['shipment_id', 'consignment_id', 'parcel_id', 'shipment'],
          tracking: ['tracking_number', 'tracking_id', 'reference_no', 'tracking'],
          location: ['origin', 'destination', 'warehouse', 'hub', 'location'],
          delivery: ['delivery_date', 'eta', 'expected_delivery', 'delivery'],
          status: ['status', 'shipment_status', 'delivery_status', 'tracking_status']
        },
        weight: 1.0
      },
      financial: {
        primaryColumns: ['account_id', 'transaction_id', 'balance', 'interest_rate', 'transaction_type'],
        secondaryColumns: ['interest_earned', 'transaction_type', 'statement', 'deposit', 'withdrawal'],
        keywords: {
          account: ['account_id', 'account_no', 'account_number', 'account'],
          transaction: ['transaction_id', 'txn_id', 'transaction_no', 'transaction'],
          balance: ['balance', 'current_balance', 'account_balance', 'amount'],
          interest: ['interest_rate', 'interest_earned', 'interest_paid', 'interest'],
          type: ['transaction_type', 'txn_type', 'deposit', 'withdrawal', 'payment']
        },
        weight: 1.0
      },
      education: {
        primaryColumns: ['student_id', 'course_id', 'grade', 'semester', 'enrollment_date'],
        secondaryColumns: ['enrollment_date', 'attendance_rate', 'feedback_score', 'gpa', 'marks'],
        keywords: {
          student: ['student_id', 'student_name', 'roll_no', 'student'],
          course: ['course_id', 'course_name', 'subject', 'course'],
          grade: ['grade', 'marks', 'score', 'gpa', 'result'],
          semester: ['semester', 'term', 'academic_year', 'year'],
          enrollment: ['enrollment_date', 'admission_date', 'registration_date', 'enrollment']
        },
        weight: 1.0
      }
    };
  }

  /**
   * Detect domain from cleaned data
   * @param {string} jobId - Cleaning job ID
   * @returns {Object} Detection result with domain, confidence, and alternatives
   */
  async detectDomain(jobId) {
    try {
      // Get cleaning job and cleaned data
      const cleaningJob = await prisma.cleaningJob.findUnique({
        where: { id: jobId },
        include: {
          upload: {
            include: {
              dataRows: {
                take: 100 // Sample first 100 rows for analysis
              }
            }
          }
        }
      });

      if (!cleaningJob) {
        throw new Error('Cleaning job not found');
      }

      if (!cleaningJob.upload || !cleaningJob.upload.dataRows || cleaningJob.upload.dataRows.length === 0) {
        throw new Error('No data found for analysis');
      }

      // Extract columns and rows from upload data
      const rows = cleaningJob.upload.dataRows.map(dr => dr.data);
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      console.log(`Analyzing ${columns.length} columns from ${rows.length} rows`);

      // Detect domain
      const detection = this._detectDomainFromColumns(columns, rows);

      console.log('Detection result:', {
        domain: detection.domain,
        confidence: detection.confidence,
        decision: detection.decision
      });

      // Verify project exists before creating domain job
      const project = await prisma.project.findUnique({
        where: { id: cleaningJob.projectId }
      });

      if (!project) {
        throw new Error(`Project ${cleaningJob.projectId} not found`);
      }

      // Create domain detection job with project connection
      const domainJob = await prisma.domainDetectionJob.create({
        data: {
          id: uuidv4(),
          cleaningJobIds: [jobId],
          detectedDomain: detection.domain,
          confidence: detection.confidence,
          decision: detection.decision,
          primaryMatches: detection.primaryMatches,
          keywordMatches: detection.keywordMatches,
          allScores: detection.allScores,
          status: 'completed',
          project: {
            connect: { id: cleaningJob.projectId }
          }
        }
      });

      return {
        domainJobId: domainJob.id,
        domain: detection.domain,
        confidence: detection.confidence,
        decision: detection.decision,
        primaryMatches: detection.primaryMatches,
        keywordMatches: detection.keywordMatches,
        top3Alternatives: detection.top3Alternatives,
        allDomains: Object.keys(this.domainSignatures)
      };

    } catch (error) {
      console.error('Domain detection failed:', error);
      throw error;
    }
  }

  /**
   * Manually select domain
   * @param {string} domainJobId - Domain detection job ID
   * @param {string} selectedDomain - User-selected domain
   * @returns {Object} Confirmation result
   */
  async confirmDomain(domainJobId, selectedDomain) {
    try {
      const domainJob = await prisma.domainDetectionJob.findUnique({
        where: { id: domainJobId }
      });

      if (!domainJob) {
        throw new Error('Domain detection job not found');
      }

      // Update domain job with user selection
      await prisma.domainDetectionJob.update({
        where: { id: domainJobId },
        data: {
          detectedDomain: selectedDomain,
          confidence: 100, // User override = 100% confidence
          decision: 'user_selected',
          status: 'confirmed'
        }
      });

      return {
        status: 'confirmed',
        domain: selectedDomain,
        domainJobId: domainJobId,
        projectId: domainJob.projectId
      };

    } catch (error) {
      console.error('Domain confirmation failed:', error);
      throw error;
    }
  }

  /**
   * Core detection algorithm
   * @private
   */
  _detectDomainFromColumns(columns, rows) {
    const columnsLower = columns.map(col => col.toLowerCase());
    const domainScores = {};

    // Score each domain
    for (const [domainName, spec] of Object.entries(this.domainSignatures)) {
      domainScores[domainName] = this._scoreDomain(columnsLower, rows, spec);
    }

    // Rank domains by total score
    const ranked = Object.entries(domainScores)
      .sort((a, b) => b[1].total - a[1].total);

    const topDomain = ranked[0];
    const top3Alternatives = ranked.slice(1, 4);

    // Calculate confidence (0-100)
    const maxPossibleScore = (spec) => {
      const keywordCount = spec.keywords 
        ? (typeof spec.keywords === 'object' && !Array.isArray(spec.keywords)
          ? Object.values(spec.keywords).flat().length
          : spec.keywords.length)
        : 0;
      return (spec.primaryColumns.length * 30) + 
             (spec.secondaryColumns.length * 15) + 
             (keywordCount * 10);
    };

    const topSpec = this.domainSignatures[topDomain[0]];
    const maxScore = maxPossibleScore(topSpec);
    const confidence = maxScore > 0 ? Math.min(100, (topDomain[1].total / maxScore) * 100) : 0;

    // Make decision based on confidence
    const decision = this._makeDecision(confidence);

    return {
      domain: topDomain[0],
      confidence: Math.round(confidence),
      decision: decision,
      primaryMatches: topDomain[1].primaryMatched,
      keywordMatches: topDomain[1].keywordsMatched,
      allScores: Object.fromEntries(ranked.map(([name, score]) => [name, score.total])),
      top3Alternatives: top3Alternatives.map(([name, score]) => ({
        domain: name,
        score: Math.round(score.total)
      }))
    };
  }

  /**
   * Score a single domain using blueprint algorithm
   * Scoring: Primary (30 pts), Secondary (15 pts), Keywords (10 pts), Data bonus (15 pts)
   * @private
   */
  _scoreDomain(columns, rows, spec) {
    // Primary column matching (30 points each) - Signature columns
    const primaryMatched = [];
    for (const primaryCol of spec.primaryColumns) {
      if (columns.some(col => col.includes(primaryCol))) {
        primaryMatched.push(primaryCol);
      }
    }
    const primaryScore = primaryMatched.length * 30;

    // Secondary column matching (15 points each)
    const secondaryMatched = [];
    for (const secondaryCol of spec.secondaryColumns) {
      if (columns.some(col => col.includes(secondaryCol))) {
        secondaryMatched.push(secondaryCol);
      }
    }
    const secondaryScore = secondaryMatched.length * 15;

    // Keyword matching (10 points each) - Enhanced with comprehensive library
    const keywordsMatched = [];
    let keywordScore = 0;
    
    if (spec.keywords) {
      // Use comprehensive keyword library if available
      if (typeof spec.keywords === 'object' && !Array.isArray(spec.keywords)) {
        // New format: { category: [keywords...] }
        for (const [category, keywordList] of Object.entries(spec.keywords)) {
          for (const keyword of keywordList) {
            for (const col of columns) {
              if (col.includes(keyword)) {
                keywordsMatched.push({ column: col, keyword: keyword, category: category });
                keywordScore += 10;
                break; // Count each keyword once
              }
            }
          }
        }
      } else {
        // Legacy format: [keywords...]
        for (const keyword of spec.keywords) {
          for (const col of columns) {
            if (col.includes(keyword)) {
              keywordsMatched.push({ column: col, keyword: keyword });
              keywordScore += 10;
              break; // Count each keyword once
            }
          }
        }
      }
    }

    // Data analysis bonus (check first 10 rows for domain-specific patterns)
    let dataScore = 0;
    if (rows.length > 0) {
      const sampleRows = rows.slice(0, Math.min(10, rows.length));
      
      // Healthcare bonus: check for medical terms in diagnosis/treatment columns
      if (columns.some(col => col.includes('diagnosis') || col.includes('patient'))) {
        const hasMedicalData = sampleRows.some(row => {
          return Object.values(row).some(val => {
            const str = String(val).toLowerCase();
            return str.includes('diag') || str.includes('treatment') || str.includes('patient');
          });
        });
        if (hasMedicalData) dataScore += 15;
      }
      
      // SaaS bonus: check for MRR/ARR patterns (numeric values in revenue columns)
      if (columns.some(col => col.includes('mrr') || col.includes('arr') || col.includes('subscription'))) {
        const hasRevenueData = sampleRows.some(row => {
          return Object.keys(row).some(key => {
            if (key.includes('mrr') || key.includes('arr')) {
              const val = row[key];
              return typeof val === 'number' && val > 0;
            }
            return false;
          });
        });
        if (hasRevenueData) dataScore += 15;
      }

      // E-commerce bonus: check for order/customer IDs
      if (columns.some(col => col.includes('order') || col.includes('customer'))) {
        const hasOrderData = sampleRows.some(row => {
          return Object.keys(row).some(key => {
            if (key.includes('order_id') || key.includes('customer_id')) {
              return row[key] !== null && row[key] !== undefined;
            }
            return false;
          });
        });
        if (hasOrderData) dataScore += 10;
      }

      // Manufacturing bonus: check for production/defect data
      if (columns.some(col => col.includes('production') || col.includes('defect') || col.includes('factory'))) {
        const hasManufacturingData = sampleRows.some(row => {
          return Object.keys(row).some(key => {
            if (key.includes('production') || key.includes('defect')) {
              return row[key] !== null;
            }
            return false;
          });
        });
        if (hasManufacturingData) dataScore += 10;
      }

      // Logistics bonus: check for shipment/tracking data
      if (columns.some(col => col.includes('shipment') || col.includes('tracking') || col.includes('delivery'))) {
        const hasLogisticsData = sampleRows.some(row => {
          return Object.keys(row).some(key => {
            if (key.includes('shipment_id') || key.includes('tracking')) {
              return row[key] !== null;
            }
            return false;
          });
        });
        if (hasLogisticsData) dataScore += 10;
      }
    }

    const totalScore = primaryScore + secondaryScore + keywordScore + dataScore;

    return {
      total: totalScore,
      primaryMatched: primaryMatched,
      secondaryMatched: secondaryMatched,
      keywordsMatched: keywordsMatched.map(k => 
        k.category ? `${k.column} (${k.keyword} in ${k.category})` : `${k.column} (${k.keyword})`
      ),
      breakdown: {
        primary: primaryScore,
        secondary: secondaryScore,
        keywords: keywordScore,
        data: dataScore
      }
    };
  }

  /**
   * Make decision based on confidence
   * @private
   */
  _makeDecision(confidence) {
    if (confidence >= 85) {
      return 'auto_detect'; // High confidence, auto-assign
    } else if (confidence >= 65) {
      return 'show_top_3'; // Medium confidence, show alternatives
    } else {
      return 'manual_select'; // Low confidence, manual selection
    }
  }

  /**
   * Get domain detection job status
   */
  async getDetectionStatus(domainJobId) {
    const domainJob = await prisma.domainDetectionJob.findUnique({
      where: { id: domainJobId },
      include: {
        cleaningJob: {
          include: {
            upload: true
          }
        }
      }
    });

    if (!domainJob) {
      throw new Error('Domain detection job not found');
    }

    return domainJob;
  }

  /**
   * Detect domain across multiple files in a project
   * @param {string} projectId - Project ID
   * @param {Array<string>} cleaningJobIds - Array of cleaning job IDs
   * @returns {Object} Combined domain detection result
   */
  async detectProjectDomain(projectId, cleaningJobIds) {
    try {
      // Validate project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // Gather all columns from all cleaned datasets
      let allColumns = [];
      let allRows = [];

      for (const jobId of cleaningJobIds) {
        const cleaningJob = await prisma.cleaningJob.findUnique({
          where: { id: jobId }
        });

        if (cleaningJob && cleaningJob.cleanedTableName) {
          const cleanedData = await prisma.cleanedData.findFirst({
            where: { tableName: cleaningJob.cleanedTableName }
          });

          if (cleanedData) {
            allColumns = [...allColumns, ...(cleanedData.columns || [])];
            allRows = [...allRows, ...(cleanedData.data || [])];
          }
        }
      }

      // Remove duplicate columns
      const uniqueColumns = [...new Set(allColumns)];

      // Detect domain from combined data
      const detection = this._detectDomainFromColumns(uniqueColumns, allRows);

      // Create domain detection job for the project
      const domainJob = await prisma.domainDetectionJob.create({
        data: {
          id: uuidv4(),
          projectId,
          cleaningJobIds: cleaningJobIds,
          detectedDomain: detection.domain,
          confidence: detection.confidence,
          decision: detection.decision,
          primaryMatches: detection.primaryMatches,
          keywordMatches: detection.keywordMatches,
          allScores: detection.allScores,
          status: 'completed'
        }
      });

      // Update project with combined domain
      await prisma.project.update({
        where: { id: projectId },
        data: { combinedDomain: detection.domain }
      });

      return {
        domainJobId: domainJob.id,
        projectId,
        domain: detection.domain,
        confidence: detection.confidence,
        decision: detection.decision,
        primaryMatches: detection.primaryMatches,
        keywordMatches: detection.keywordMatches,
        top3Alternatives: detection.top3Alternatives,
        filesAnalyzed: cleaningJobIds.length,
        totalColumns: uniqueColumns.length
      };

    } catch (error) {
      console.error('Project domain detection failed:', error);
      throw error;
    }
  }

  /**
   * List all available domains
   * @returns {Array} List of domain names with descriptions
   */
  listAvailableDomains() {
    return Object.keys(this.domainSignatures).map(domain => ({
      name: domain,
      displayName: domain.charAt(0).toUpperCase() + domain.slice(1),
      primaryColumns: this.domainSignatures[domain].primaryColumns.slice(0, 3),
      description: this._getDomainDescription(domain)
    }));
  }

  /**
   * Get domain description
   * @private
   */
  _getDomainDescription(domain) {
    const descriptions = {
      retail: 'Physical stores, inventory, product sales, stock management',
      ecommerce: 'Online shopping, orders, shipping, customer transactions',
      saas: 'Software subscriptions, MRR, ARR, customer retention, tiers',
      healthcare: 'Patient records, medical procedures, diagnoses, treatments',
      manufacturing: 'Production, equipment, quality control, supply chain',
      logistics: 'Shipping, deliveries, fleet management, warehouse operations',
      financial: 'Banking, transactions, investments, loans, portfolios',
      education: 'Students, courses, grades, enrollment, academic records'
    };
    return descriptions[domain] || '';
  }
}

export default new DomainDetectionService();
