/**
 * Domain Detection Service (Module 3)
 * Rule-Based Domain Classification with Confidence Scoring
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

class DomainDetectionService {
  constructor() {
    // Define signature columns and keywords for each domain
    this.domainSignatures = {
      retail: {
        primaryColumns: ['product_id', 'sku', 'category', 'inventory', 'units_sold'],
        secondaryColumns: ['price', 'revenue', 'discount', 'brand', 'supplier', 'stock'],
        keywords: ['product', 'category', 'sku', 'inventory', 'stock', 'retail', 'store'],
        weight: 1.0
      },
      ecommerce: {
        primaryColumns: ['customer_id', 'order_id', 'shipping_address', 'delivery_date'],
        secondaryColumns: ['payment_method', 'order_value', 'tracking_number', 'cart'],
        keywords: ['customer', 'order', 'shipping', 'delivery', 'cart', 'checkout', 'ecommerce'],
        weight: 1.0
      },
      saas: {
        primaryColumns: ['subscription_id', 'mrr', 'arr', 'churn', 'customer_id'],
        secondaryColumns: ['tier', 'signup_date', 'ltv', 'cac', 'plan'],
        keywords: ['subscription', 'mrr', 'arr', 'churn', 'tier', 'plan', 'saas'],
        weight: 1.0
      },
      healthcare: {
        primaryColumns: ['patient_id', 'diagnosis', 'provider_id', 'visit_date'],
        secondaryColumns: ['treatment_type', 'outcome', 'cost', 'appointment'],
        keywords: ['patient', 'diagnosis', 'provider', 'treatment', 'medical', 'hospital'],
        weight: 1.0
      },
      manufacturing: {
        primaryColumns: ['factory_id', 'production_qty', 'defect_rate', 'supplier_id'],
        secondaryColumns: ['machine_id', 'batch_id', 'quality_score', 'output'],
        keywords: ['production', 'defect', 'factory', 'supplier', 'manufacturing', 'quality'],
        weight: 1.0
      },
      logistics: {
        primaryColumns: ['shipment_id', 'tracking_number', 'delivery_date', 'origin'],
        secondaryColumns: ['destination', 'status', 'cost', 'warehouse'],
        keywords: ['shipment', 'tracking', 'delivery', 'warehouse', 'logistics', 'freight'],
        weight: 1.0
      },
      financial: {
        primaryColumns: ['account_id', 'transaction_id', 'balance', 'interest_rate'],
        secondaryColumns: ['interest_earned', 'transaction_type', 'statement'],
        keywords: ['account', 'transaction', 'balance', 'interest', 'financial', 'bank'],
        weight: 1.0
      },
      education: {
        primaryColumns: ['student_id', 'course_id', 'grade', 'semester'],
        secondaryColumns: ['enrollment_date', 'attendance_rate', 'feedback_score'],
        keywords: ['student', 'course', 'grade', 'enrollment', 'semester', 'education'],
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
          upload: true
        }
      });

      if (!cleaningJob) {
        throw new Error('Cleaning job not found');
      }

      // Get cleaned data
      const cleanedData = await prisma.cleanedData.findFirst({
        where: { tableName: cleaningJob.cleanedTableName }
      });

      if (!cleanedData || !cleanedData.data) {
        throw new Error('Cleaned data not found');
      }

      // Extract columns from cleaned data
      const columns = cleanedData.columns || [];
      const rows = cleanedData.data || [];

      // Detect domain
      const detection = this._detectDomainFromColumns(columns, rows);

      // Create domain detection job
      const domainJob = await prisma.domainDetectionJob.create({
        data: {
          id: uuidv4(),
          cleaningJobId: jobId,
          detectedDomain: detection.domain,
          confidence: detection.confidence,
          decision: detection.decision,
          primaryMatches: detection.primaryMatches,
          keywordMatches: detection.keywordMatches,
          allScores: detection.allScores,
          status: 'completed'
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
        where: { id: domainJobId },
        include: {
          cleaningJob: true
        }
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
        cleaningJobId: domainJob.cleaningJobId,
        uploadId: domainJob.cleaningJob.uploadId
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
      return (spec.primaryColumns.length * 30) + 
             (spec.secondaryColumns.length * 15) + 
             (spec.keywords.length * 10);
    };

    const topSpec = this.domainSignatures[topDomain[0]];
    const confidence = Math.min(100, (topDomain[1].total / maxPossibleScore(topSpec)) * 100);

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
   * Score a single domain
   * @private
   */
  _scoreDomain(columns, rows, spec) {
    // Primary column matching (30 points each)
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

    // Keyword matching (10 points each)
    const keywordsMatched = [];
    for (const keyword of spec.keywords) {
      for (const col of columns) {
        if (col.includes(keyword)) {
          keywordsMatched.push({ column: col, keyword: keyword });
          break; // Count each keyword once
        }
      }
    }
    const keywordScore = keywordsMatched.length * 10;

    // Data analysis bonus (check first 10 rows for domain-specific patterns)
    let dataScore = 0;
    if (rows.length > 0) {
      // Healthcare bonus: check for medical terms
      if (spec.keywords.includes('diagnosis') || spec.keywords.includes('patient')) {
        dataScore += 15;
      }
      // SaaS bonus: check for MRR/ARR patterns
      if (spec.keywords.includes('mrr') || spec.keywords.includes('arr')) {
        dataScore += 15;
      }
    }

    const totalScore = primaryScore + secondaryScore + keywordScore + dataScore;

    return {
      total: totalScore,
      primaryMatched: primaryMatched,
      secondaryMatched: secondaryMatched,
      keywordsMatched: keywordsMatched.map(k => `${k.column} (${k.keyword})`)
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
}

export default new DomainDetectionService();
