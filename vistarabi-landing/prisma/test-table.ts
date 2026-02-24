import { Pool } from 'pg';

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/vistarabi' });
    try {
        const res = await pool.query('SELECT COUNT(*) FROM "merged_data"');
        console.log('Results:', res.rows[0]);
    } catch (e: any) {
        console.error('Error:', e.message);
    }
    process.exit(0);
}

main().catch(console.error);
