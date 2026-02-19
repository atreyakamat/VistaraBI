// Module 5A — Runtime Test Script
// Verifies dashboard config generation end-to-end

import db from '../src/lib/prisma';
import { generateDashboardConfig, getDashboardConfig } from '../src/lib/dashboard';
import { randomUUID } from 'crypto';

async function main() {
    console.log('🧪 Module 5A — Dashboard Config Generation Test\n');

    // 1. Create test user + project
    const userId = randomUUID();
    const projectId = randomUUID();

    console.log('1️⃣ Setting up test data...');
    const user = await db.user.create({
        data: { id: userId, name: 'Dashboard Test User', email: `dash-test-${randomUUID()}@test.com`, password: 'test' },
    });

    const project = await db.project.create({
        data: { id: projectId, name: 'E-Commerce Analytics', userId: user.id },
    });

    // 2. Create domain detection
    await db.domainDetection.create({
        data: {
            projectId,
            detectedDomain: 'ECOMMERCE',
            confidence: 0.92,
            status: 'AUTO_ASSIGNED',
            scoringBreakdown: { ECOMMERCE: 92, RETAIL: 45, SAAS: 12 } as any,
            matchedColumns: ['order_id', 'customer_id', 'price', 'quantity'],
            explanation: 'Detected e-commerce domain with high confidence',
        },
    });

    // 3. Create KPI Blueprint with diverse categories
    const testKPIs = [
        { kpiId: 'ec-001', kpiName: 'Total Revenue', formula: 'SUM(total_amount)', category: 'revenue', matchedColumns: ['total_amount'], confidence: 0.95, addedAt: new Date().toISOString() },
        { kpiId: 'ec-002', kpiName: 'Average Order Value', formula: 'AVG(total_amount)', category: 'revenue', matchedColumns: ['total_amount'], confidence: 0.90, addedAt: new Date().toISOString() },
        { kpiId: 'ec-003', kpiName: 'Total Orders', formula: 'COUNT(order_id)', category: 'volume', matchedColumns: ['order_id'], confidence: 0.98, addedAt: new Date().toISOString() },
        { kpiId: 'ec-004', kpiName: 'Customer Count', formula: 'COUNT(DISTINCT customer_id)', category: 'customer', matchedColumns: ['customer_id'], confidence: 0.93, addedAt: new Date().toISOString() },
        { kpiId: 'ec-005', kpiName: 'Repeat Purchase Rate', formula: 'COUNT(repeat_orders) / COUNT(total_orders)', category: 'retention', matchedColumns: ['repeat_orders', 'total_orders'], confidence: 0.78, addedAt: new Date().toISOString() },
        { kpiId: 'ec-006', kpiName: 'Gross Profit', formula: 'SUM(revenue) - SUM(cost)', category: 'profitability', matchedColumns: ['revenue', 'cost'], confidence: 0.88, addedAt: new Date().toISOString() },
        { kpiId: 'ec-007', kpiName: 'Cart Abandonment Rate', formula: 'COUNT(abandoned) / COUNT(carts)', category: 'engagement', matchedColumns: ['abandoned', 'carts'], confidence: 0.72, addedAt: new Date().toISOString() },
        { kpiId: 'ec-008', kpiName: 'Fulfillment Rate', formula: 'COUNT(shipped) / COUNT(orders)', category: 'operations', matchedColumns: ['shipped', 'orders'], confidence: 0.85, addedAt: new Date().toISOString() },
    ];

    await db.kPIBlueprint.create({
        data: {
            projectId,
            kpis: testKPIs as any,
            version: 1,
            isLocked: true,
        },
    });

    console.log(`   Created project "${project.name}" with ${testKPIs.length} KPIs\n`);

    // 4. Generate dashboard config
    console.log('2️⃣ Generating dashboard config...');
    const config = await generateDashboardConfig(projectId);
    console.log(`   ✅ Generated v${config.version}\n`);

    // 5. Validate sections
    console.log('3️⃣ Validating sections:');
    for (const section of config.sections) {
        console.log(`   ${section.icon} ${section.title} (${section.cards.length} KPIs)`);
        for (const card of section.cards) {
            console.log(`      • ${card.kpiName} → ${card.chartSelection.chartType} [${card.cardSize}]`);
        }
    }

    // 6. Validate sidebar
    console.log(`\n4️⃣ Validating sidebar (${config.sidebarConfig.items.length} items):`);
    for (const item of config.sidebarConfig.items) {
        const status = item.enabled ? '🟢' : '⚫';
        const badge = item.badge ? ` (${item.badge})` : '';
        console.log(`   ${status} ${item.icon} ${item.label}${badge}`);
        if (item.children) {
            for (const child of item.children) {
                const cs = child.enabled ? '🟢' : '⚫';
                console.log(`      ${cs} ${child.icon} ${child.label}`);
            }
        }
    }

    // 7. Validate metadata
    console.log(`\n5️⃣ Metadata:`);
    console.log(`   Domain: ${config.metadata.domainIcon} ${config.metadata.domainName}`);
    console.log(`   Color: ${config.metadata.domainColor}`);
    console.log(`   KPIs: ${config.metadata.totalKPIs}`);
    console.log(`   Sections: ${config.metadata.totalSections}`);

    // 8. Verify persistence
    console.log(`\n6️⃣ Verifying persistence...`);
    const retrieved = await getDashboardConfig(projectId);
    if (retrieved && retrieved.version === config.version) {
        console.log('   ✅ Config retrieved from DB matches generated config');
    } else {
        console.error('   ❌ Persistence verification failed');
    }

    // 9. Test regeneration (version increment)
    console.log('\n7️⃣ Testing regeneration...');
    const v2 = await generateDashboardConfig(projectId);
    if (v2.version === config.version + 1) {
        console.log(`   ✅ Version incremented: v${config.version} → v${v2.version}`);
    } else {
        console.error(`   ❌ Version increment failed: expected v${config.version + 1}, got v${v2.version}`);
    }

    console.log('\n🎉 Module 5A test complete!');
    await db.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
