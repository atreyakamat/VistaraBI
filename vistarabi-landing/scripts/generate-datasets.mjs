/**
 * VistaraBI — Massive Unified Dataset Generator (10 Files per Domain)
 * Generates 10 files per domain × 8 domains = 80 files
 * Each file: 1,000,000 rows × 25 columns
 * Focuses on continuous data points (timestamps, metrics) and 10 transaction styles.
 * Uses tight distributions to ensure NO ANOMALIES.
 */

import { createWriteStream } from 'fs';
import { mkdir, rm } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'test-datasets');
const ROWS = 1_000_000;
const FILES_PER_DOMAIN = 10;
const BATCH = 20_000; // Increased batch size for faster writing

// Deterministic random
let seed = 42;
function rand() { seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF; return Math.abs(seed) / 0x7FFFFFFF; }
function randInt(min, max) { return Math.floor(rand() * (max - min + 1)) + min; }
function randFloat(min, max, dp = 2) { return +(rand() * (max - min) + min).toFixed(dp); }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

// Continuous time generator (over 1 year, smoothly spaced)
global.GLOBAL_ROW_INDEX = 0;
function continuousTimestamp() {
    const totalMs = 365 * 24 * 60 * 60 * 1000;
    const offsetMs = (global.GLOBAL_ROW_INDEX / ROWS) * totalMs;
    // Very small noise to prevent anomalies in time-series (max +/- 5 mins)
    const noise = randInt(-300000, 300000); 
    const d = new Date(Date.now() - totalMs + offsetMs + noise);
    return d.toISOString();
}

const DOMAIN_STYLES = {
    ecommerce: ['page_view', 'search', 'add_to_cart', 'checkout_start', 'purchase', 'review_submit', 'return_request', 'support_chat', 'wishlist_add', 'promo_apply'],
    edtech: ['login', 'course_view', 'video_play', 'video_pause', 'quiz_start', 'quiz_submit', 'assignment_upload', 'forum_post', 'certificate_download', 'support_ticket'],
    retail: ['store_entry', 'aisle_browse', 'product_scan', 'fitting_room', 'pos_checkout', 'loyalty_scan', 'return_item', 'kiosk_search', 'pickup_order', 'restock'],
    saas: ['login', 'dashboard_load', 'report_export', 'api_call', 'settings_update', 'invite_user', 'upgrade_plan', 'downgrade_plan', 'support_ticket', 'logout'],
    finance: ['login', 'balance_check', 'transfer_init', 'transfer_complete', 'bill_pay', 'trade_exec', 'loan_apply', 'card_swipe', 'atm_withdraw', 'support_call'],
    healthcare: ['appointment_book', 'check_in', 'vitals_taken', 'doctor_consult', 'lab_test', 'prescription_issue', 'pharmacy_dispense', 'discharge', 'followup_call', 'claim_file'],
    manufacturing: ['shift_start', 'machine_start', 'telemetry_ping', 'qa_check', 'defect_log', 'maintenance_req', 'maintenance_done', 'batch_complete', 'inventory_pull', 'shift_end'],
    services: ['client_onboard', 'project_kickoff', 'timesheet_log', 'milestone_reach', 'invoice_sent', 'payment_recv', 'feedback_req', 'feedback_recv', 'issue_log', 'issue_resolve']
};

const FILE_THEMES = [
    'transactions', 'interactions', 'operations', 'support', 'marketing', 
    'feedback', 'finance', 'users', 'performance', 'system'
];

const HEADERS = [
    'timestamp', 'record_id', 'entity_id', 'entity_segment', 'entity_region', 
    'target_id', 'target_category', 'target_subcategory', 'event_style', 'event_channel', 
    'status', 'metric_1_value', 'metric_2_time_ms', 'metric_3_rate', 'metric_4_physical', 
    'metric_5_financial', 'flag_1_active', 'flag_2_priority', 'context_1', 'context_2', 
    'tag_1', 'tag_2', 'version_code', 'coord_x', 'coord_y'
].join(',');

function generateRow(domain, fileIndex) {
    const styles = DOMAIN_STYLES[domain] || DOMAIN_STYLES.ecommerce;
    
    // Create tight distributions to prevent anomalies
    // Tweak the baseline slightly depending on the file index to make them "partially related" but distinct
    const baselineShift = fileIndex * 2;

    return [
        continuousTimestamp(),
        `REC_${randInt(1000000, 9999999)}`,
        `ENT_${randInt(10000, 50000)}`, // Shared entity pool
        pick(['Premium', 'Standard', 'Basic']),
        pick(['North', 'South', 'East', 'West']),
        `TGT_${randInt(1000, 2000)}`, // Shared targets
        pick(['Category_A', 'Category_B', 'Category_C']),
        pick(['Sub_1', 'Sub_2']),
        pick(styles), 
        pick(['Web', 'Mobile_App', 'API']),
        pick(['Success', 'Pending', 'Success']), // Skewed to Success to avoid failure anomalies
        randFloat(100 + baselineShift, 150 + baselineShift, 2),    // metric_1 (tight)
        randInt(100 + baselineShift * 10, 500 + baselineShift * 10),// metric_2 time (tight)
        randFloat(0.80, 0.99, 4),                                  // metric_3 rate (high success)
        randFloat(20.0, 25.0, 2),                                  // metric_4 physical (tight temp)
        randFloat(50.0 + baselineShift, 100.0 + baselineShift, 2), // metric_5 financial (stable)
        pick(['true', 'true', 'false']),
        pick(['true', 'false']),
        `CTX_${fileIndex}_${randInt(100, 200)}`,
        `CTX_B_${randInt(100, 200)}`,
        pick(['TagA', 'TagB']),
        pick(['Group1', 'Group2']),
        `v1.${fileIndex}`,
        randFloat(40.0, 42.0, 4), // Tight coordinates (e.g., NY area)
        randFloat(-74.0, -72.0, 4)
    ].join(',');
}

async function writeMasterDataset(domain) {
    const domainDir = path.join(OUT_DIR, domain);
    // Clear old files
    try { await rm(domainDir, { recursive: true, force: true }); } catch (e) {}
    await mkdir(domainDir, { recursive: true });
    
    for (let fileIndex = 0; fileIndex < FILES_PER_DOMAIN; fileIndex++) {
        const theme = FILE_THEMES[fileIndex];
        const filePath = path.join(domainDir, `${domain}_${theme}.csv`);
        const t = Date.now();
        
        process.stdout.write(`   ⏳ ${domain}_${theme}.csv (${ROWS.toLocaleString()} rows)...`);
        
        await new Promise((resolve, reject) => {
            const ws = createWriteStream(filePath, { encoding: 'utf8' });
            ws.on('error', reject);
            ws.write(HEADERS + '\n');

            let written = 0;
            global.GLOBAL_ROW_INDEX = 0;
            
            function writeBatch() {
                let ok = true;
                while (written < ROWS && ok) {
                    const batchEnd = Math.min(written + BATCH, ROWS);
                    const lines = [];
                    for (let i = written; i < batchEnd; i++) {
                        global.GLOBAL_ROW_INDEX = i;
                        lines.push(generateRow(domain, fileIndex));
                    }
                    ok = ws.write(lines.join('\n') + '\n');
                    written = batchEnd;
                }
                if (written >= ROWS) {
                    ws.end();
                } else {
                    ws.once('drain', writeBatch);
                }
            }

            ws.on('finish', resolve);
            writeBatch();
        });
        
        const elapsed = ((Date.now() - t) / 1000).toFixed(1);
        console.log(` ✅ ${elapsed}s`);
    }
}

const args = process.argv.slice(2);
const generateAll = args.includes('--all');
const targetDomain = args.find(a => !a.startsWith('--'));
const domainsToRun = generateAll ? Object.keys(DOMAIN_STYLES) : (targetDomain ? [targetDomain] : ['ecommerce']);

console.log(`\n🗄  VistaraBI Continuous Data Generator (10 Files per Domain)`);
console.log(`   Domains: ${domainsToRun.join(', ')}`);
console.log(`   Format: 10 files/domain | 1M rows/file | 25 columns | Tight Distributions (No Anomalies)`);
console.log(`   Output: ${OUT_DIR}\n`);

const start = Date.now();
async function main() {
    for (const domain of domainsToRun) {
        if (!DOMAIN_STYLES[domain]) {
            console.error(`  ❌ Unknown domain: ${domain}`);
            continue;
        }
        console.log(`\n📂 ${domain.toUpperCase()}`);
        await writeMasterDataset(domain);
    }

    const totalSecs = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n✅ Done. Generated ${domainsToRun.length * FILES_PER_DOMAIN} files in ${totalSecs}s\n`);
}

main().catch(console.error);
