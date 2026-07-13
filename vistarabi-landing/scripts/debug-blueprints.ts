import db from '../src/lib/prisma';
import { Pool } from 'pg';

async function main() {
    const projects = await db.project.findMany({ take: 10, select: { id: true, name: true } });
    console.log('\n=== PROJECTS ===');
    for (const p of projects) {
        console.log(` - ${p.name} (${p.id})`);
        const bp = await db.kPIBlueprint.findFirst({
            where: { projectId: p.id },
            include: { kpis: { take: 5, include: { aggregations: true } } }
        });
        if (bp) {
            for (const k of bp.kpis) {
                const agg = k.aggregations[0];
                console.log(`    KPI: ${k.name} | table: ${k.sourceTable} | agg: ${agg?.function}(${agg?.column})`);
            }
        } else {
            console.log('    (no blueprint)');
        }
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    console.log('\n=== MATERIALIZED TABLES ===');
    const res = await pool.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name LIKE 'merged_data_%'
        ORDER BY table_name
    `);
    for (const row of res.rows) {
        const cols = await pool.query(
            `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 LIMIT 25`,
            [row.table_name]
        );
        const count = await pool.query(`SELECT COUNT(*) FROM "${row.table_name}"`);
        console.log(`\n [${row.table_name}] rows=${count.rows[0].count}`);
        console.log('  Columns:', cols.rows.map((c: any) => `${c.column_name}`).join(', '));
    }
    // Test a SaaS table — "Expansion Revenue" KPI
    const saasTable = 'merged_data_f19ecc5b_983f_4833_826b_03619cd6e7bc';
    console.log('\n=== SAAS TABLE SAMPLE ===');
    try {
        const sample = await pool.query(`SELECT * FROM "${saasTable}" LIMIT 2`);
        console.log('Row 1:', JSON.stringify(sample.rows[0]));
        // Test what SUM(mrr) returns
        const mrrTest = await pool.query(
            `SELECT DATE_TRUNC('month', "signup_date"::TIMESTAMP)::DATE AS period, SUM("mrr"::NUMERIC) AS value FROM "${saasTable}" GROUP BY 1 ORDER BY 1 LIMIT 6`
        );
        console.log('\nMRR time-series test:', JSON.stringify(mrrTest.rows));
    } catch(e: any) {
        console.log('SaaS table error:', e.message);
    }
    await pool.end();
    await db.$disconnect();
}
main().catch(console.error);
