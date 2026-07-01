import { execSync } from 'child_process';

const domains = [
    'ecommerce',
    'saas',
    'retail',
    'edtech',
    'manufacturing',
    'healthcare',
    'finance',
    'services'
];

for (const domain of domains) {
    console.log(`\n================================`);
    console.log(`📸 Running capture for: ${domain}`);
    console.log(`================================`);
    try {
        execSync(`node capture-full-flow.mjs ${domain}`, { stdio: 'inherit' });
    } catch (e) {
        console.error(`Error capturing ${domain}:`, e.message);
    }
}
console.log('✅ All domains captured!');
