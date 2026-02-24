import { Pool } from 'pg';
import db from '../src/lib/prisma';

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/vistarabi' });
    try {
        const res = await pool.query('SELECT * FROM "merged_data" LIMIT 1');
        console.log('Postgres columns:', Object.keys(res.rows[0] || {}));

        const kpi = await db.approvedKPI.findFirst({
            where: { id: '35b619f6-38eb-4fc2-8666-c05c8d4e5115' },
            include: { aggregations: true, groupBys: true, lineage: true }
        });
        console.log('KPI schema mapping:', JSON.stringify(kpi, null, 2));

    } catch (e: any) {
        console.error('Error:', e.message);
    }
    process.exit(0);
}

main().catch(console.error);
