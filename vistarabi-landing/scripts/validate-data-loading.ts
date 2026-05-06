/**
 * Validation script to test data loading
 * Run with: npx tsx scripts/validate-data-loading.ts
 */

import fs from 'fs';
import path from 'path';

async function validateDataLoading() {
  console.log('🔍 Validating data loading setup...\n');

  // Check current working directory
  const cwd = process.cwd();
  console.log(`📁 Working directory: ${cwd}`);

  // Check for data files
  const filesToCheck = [
    {
      name: 'E-Commerce High Quality Data',
      path: path.join(cwd, '..', 'dummy-data', 'ecommerce_high_quality.csv'),
      altPath: path.join(cwd, 'dummy-data', 'ecommerce_high_quality.csv'),
    },
    {
      name: 'E-Commerce Orders Data',
      path: path.join(cwd, '..', 'dummy-data', 'module-8', 'ecommerce_orders.csv'),
      altPath: path.join(cwd, 'dummy-data', 'module-8', 'ecommerce_orders.csv'),
    },
    {
      name: 'Finance Data',
      path: path.join(cwd, 'datasets', 'finance', 'archive (52)', 'synthetic_personal_finance_dataset.csv'),
      altPath: path.join(cwd, '..', 'vistarabi-landing', 'datasets', 'finance', 'archive (52)', 'synthetic_personal_finance_dataset.csv'),
    },
  ];

  console.log('\n📂 Checking data files:\n');

  let allFound = true;
  for (const file of filesToCheck) {
    const exists = fs.existsSync(file.path) || fs.existsSync(file.altPath);
    const actualPath = fs.existsSync(file.path) ? file.path : file.altPath;

    if (exists) {
      const stats = fs.statSync(actualPath);
      console.log(`✅ ${file.name}`);
      console.log(`   Path: ${actualPath}`);
      console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB\n`);
    } else {
      console.log(`❌ ${file.name}`);
      console.log(`   Expected paths:`);
      console.log(`   - ${file.path}`);
      console.log(`   - ${file.altPath}\n`);
      allFound = false;
    }
  }

  if (allFound) {
    console.log('✅ All data files found! Data loading should work correctly.\n');
  } else {
    console.log('⚠️  Some data files are missing. Please check the paths.\n');
  }

  // Check module setup
  console.log('📦 Checking module files:\n');

  const modulesToCheck = [
    { name: 'data-loaders.ts', path: 'src/lib/demo/data-loaders.ts' },
    { name: 'ecommerce-processor.ts', path: 'src/lib/demo/ecommerce-processor.ts' },
    { name: 'finance-processor.ts', path: 'src/lib/demo/finance-processor.ts' },
    { name: 'use-real-data.ts', path: 'src/lib/hooks/use-real-data.ts' },
    { name: 'ecommerce API route', path: 'src/app/api/data/ecommerce/route.ts' },
    { name: 'finance API route', path: 'src/app/api/data/finance/route.ts' },
    { name: 'EcommerceDashboardLive', path: 'src/components/domains/EcommerceDashboardLive.tsx' },
    { name: 'FinanceDashboardLive', path: 'src/components/domains/FinanceDashboardLive.tsx' },
    { name: 'Data integration tests', path: 'tests/data-integration.test.ts' },
  ];

  for (const mod of modulesToCheck) {
    const exists = fs.existsSync(path.join(cwd, mod.path));
    console.log(`${exists ? '✅' : '❌'} ${mod.name}`);
  }

  console.log('\n✨ Validation complete!\n');
}

validateDataLoading().catch(console.error);
