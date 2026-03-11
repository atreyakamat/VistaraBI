// Module 7: Goal Decomposer
// Breaks down a primary goal into contributing sub-KPIs based on domain logic

import { ParsedGoal } from './goal-parser';

export interface DecomposedFactor {
    metric: string;
    requiredChange: string;
    requiredChangePercent?: number;
    description: string;
    weight: number; // 0–1, how much this factor contributes to the primary KPI
}

export interface DecomposedGoal {
    primaryMetric: string;
    targetValue: string;
    changeDirection: 'increase' | 'decrease' | 'maintain';
    factors: DecomposedFactor[];
    formula: string;
}

/**
 * Deterministic decomposition of a goal into its driving sub-KPIs.
 * Based on domain KPI formulas from the Module 4 blueprint.
 */
export function decomposeGoal(goal: ParsedGoal, domain: string): DecomposedGoal {
    const factors: DecomposedFactor[] = [];
    const changePercent = goal.changePercent;
    const target = goal.targetValue;
    const dir = goal.changeDirection;

    const changeLabel = dir === 'decrease'
        ? `↓ ${target}`
        : `↑ ${target}`;

    let formula = '';

    // ── E-Commerce / Retail: Revenue ───────────────────────────────────────────
    if (goal.kpiId === 'ec-001' || goal.targetMetric === 'revenue' ||
        goal.kpiId === 'rt-001' || goal.targetMetric === 'store sales') {
        formula = 'Revenue = Orders × AOV × (1 − Discount Rate)';
        factors.push(
            {
                metric: 'Order Count',
                requiredChange: changeLabel,
                requiredChangePercent: changePercent ? changePercent * 0.5 : undefined,
                description: 'Increase the total number of orders placed by attracting more customers or improving repeat purchase rate.',
                weight: 0.5,
            },
            {
                metric: 'Average Order Value',
                requiredChange: changeLabel,
                requiredChangePercent: changePercent ? changePercent * 0.3 : undefined,
                description: 'Increase the average spend per order through upselling, bundling, or minimum-spend promotions.',
                weight: 0.3,
            },
            {
                metric: 'Discount Rate',
                requiredChange: '↓ Reduce discounts',
                description: 'Reduce excessive discounting to protect margins while maintaining volume.',
                weight: 0.2,
            }
        );
    }

    // ── E-Commerce: Conversion Rate ─────────────────────────────────────────────
    else if (goal.kpiId === 'ec-004' || goal.targetMetric === 'conversion rate') {
        formula = 'Conversion Rate = (Orders / Sessions) × 100';
        factors.push(
            {
                metric: 'Session Quality',
                requiredChange: changeLabel,
                requiredChangePercent: changePercent ? changePercent * 0.4 : undefined,
                description: 'Improve traffic quality by focusing paid ads on high-intent audiences.',
                weight: 0.4,
            },
            {
                metric: 'Checkout Completion',
                requiredChange: changeLabel,
                requiredChangePercent: changePercent ? changePercent * 0.4 : undefined,
                description: 'Reduce cart abandonment with streamlined checkout and trust signals.',
                weight: 0.4,
            },
            {
                metric: 'Product Page Engagement',
                requiredChange: changeLabel,
                description: 'Improve product images, reviews, and CTAs to drive add-to-cart.',
                weight: 0.2,
            }
        );
    }

    // ── SaaS: MRR ───────────────────────────────────────────────────────────────
    else if (goal.kpiId === 'saas-001' || goal.targetMetric === 'mrr') {
        formula = 'MRR = Seat Count × ARPU';
        factors.push(
            {
                metric: 'Seat Count / Active Subscribers',
                requiredChange: changeLabel,
                requiredChangePercent: changePercent ? changePercent * 0.6 : undefined,
                description: 'Grow the number of paying subscribers through top-of-funnel acquisition and trial conversion.',
                weight: 0.6,
            },
            {
                metric: 'Average Revenue Per User (ARPU)',
                requiredChange: changeLabel,
                requiredChangePercent: changePercent ? changePercent * 0.4 : undefined,
                description: 'Increase ARPU by upselling to higher-tier plans or adding paid add-ons.',
                weight: 0.4,
            }
        );
    }

    // ── SaaS: Churn ─────────────────────────────────────────────────────────────
    else if (goal.kpiId === 'saas-003' || goal.targetMetric === 'churn') {
        formula = 'Churn Rate = Churned Customers / Total Customers';
        factors.push(
            {
                metric: 'Customer Retention',
                requiredChange: changeLabel,
                requiredChangePercent: changePercent ? changePercent * 0.5 : undefined,
                description: 'Improve the percentage of users staying on the platform through proactive customer success.',
                weight: 0.5,
            },
            {
                metric: 'Renewal Rate',
                requiredChange: changeLabel,
                requiredChangePercent: changePercent ? changePercent * 0.3 : undefined,
                description: 'Increase the success rate of subscription renewals with automated renewal campaigns.',
                weight: 0.3,
            },
            {
                metric: 'Product Engagement',
                requiredChange: '↑ Increase engagement',
                description: 'Improve feature adoption so users experience consistent value before renewal.',
                weight: 0.2,
            }
        );
    }

    // ── SaaS: NRR ───────────────────────────────────────────────────────────────
    else if (goal.kpiId === 'saas-005' || goal.targetMetric === 'nrr') {
        formula = 'NRR = (Starting MRR + Expansion − Contraction − Churned) / Starting MRR';
        factors.push(
            {
                metric: 'Expansion Revenue',
                requiredChange: changeLabel,
                description: 'Increase upsell and cross-sell revenue from existing customers.',
                weight: 0.5,
            },
            {
                metric: 'Churn and Contraction',
                requiredChange: '↓ Reduce churned MRR',
                description: 'Reduce revenue lost to cancellations and downgrades.',
                weight: 0.5,
            }
        );
    }

    // ── Retail: Footfall ─────────────────────────────────────────────────────────
    else if (goal.kpiId === 'rt-002' || goal.targetMetric === 'footfall') {
        formula = 'Revenue = Footfall × Conversion Rate × AOV';
        factors.push(
            {
                metric: 'Store Visitor Count',
                requiredChange: changeLabel,
                requiredChangePercent: changePercent,
                description: 'Drive more in-store visits through local marketing, events, and promotions.',
                weight: 0.6,
            },
            {
                metric: 'In-Store Conversion Rate',
                requiredChange: '↑ Improve',
                description: 'Train staff to convert more visitors into buyers through product demos and personalised recommendations.',
                weight: 0.4,
            }
        );
    }

    // ── Generic Fallback ─────────────────────────────────────────────────────────
    else {
        formula = `${goal.targetMetric} = Direct improvement`;
        factors.push({
            metric: goal.targetMetric,
            requiredChange: changeLabel,
            requiredChangePercent: changePercent,
            description: `Drive direct improvement in ${goal.targetMetric} through focused operational effort.`,
            weight: 1.0,
        });
    }

    return {
        primaryMetric: goal.targetMetric,
        targetValue: goal.targetValue,
        changeDirection: goal.changeDirection,
        factors,
        formula,
    };
}
