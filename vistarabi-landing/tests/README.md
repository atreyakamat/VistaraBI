# VistaraBI Testing Framework

## Overview

Comprehensive testing framework for Module 1 (Data Ingestion & Intelligence) and Module 2 (Purification & Quality Intelligence) of VistaraBI.

## Test Structure

```
tests/
├── data/
│   └── test-data-generator.ts    # Generates realistic business datasets
├── module1.test.ts                # Module 1: Ingestion & Intelligence tests
├── module2.test.ts                # Module 2: Purification & Quality tests
├── integration.test.ts            # End-to-end workflow tests
└── package.json                   # Test dependencies
```

## Quick Start

### 1. Install Dependencies

```bash
cd tests
npm install
```

### 2. Run All Tests

```bash
npm test
```

### 3. Run Individual Test Suites

```bash
# Module 1 only
npm run test:module1

# Module 2 only
npm run test:module2
```

## Test Coverage

### Module 1 Tests (10 tests)
- ✅ Authentication
- ✅ Project creation
- ✅ Multi-file upload
- ✅ CSV parsing
- ✅ JSON parsing
- ✅ XML parsing
- ✅ Column intelligence
- ✅ Relationship detection
- ✅ Data preview
- ✅ Project deletion

### Module 2 Tests (14 tests)

**Phase 2A: Purification (8 tests)**
- ✅ Null handling (mean/median/mode)
- ✅ Duplicate removal
- ✅ Date normalization
- ✅ Currency normalization
- ✅ Text standardization
- ✅ Empty column removal
- ✅ Purification idempotency
- ✅ Transformation audit logging

**Phase 2B: Quality Intelligence (6 tests)**
- ✅ Completeness calculation
- ✅ Consistency calculation
- ✅ Outlier detection (IQR method)
- ✅ Quality grading (A-F)
- ✅ Column health grading
- ✅ Risk level determination

### Integration Tests (5 scenarios)
- ✅ E-commerce company workflow
- ✅ SaaS company workflow
- ✅ Mixed format workflow
- ✅ High quality data workflow
- ✅ Poor quality data workflow

## Test Data

The framework includes realistic business datasets with intentional quality issues:

### E-commerce Company
- **Datasets**: customers, products, orders, invoices
- **Issues**: 6 nulls, 2 duplicates, 4 date format variations, 4 currency variations, 1 outlier

### SaaS Company
- **Datasets**: customers, subscriptions, invoices, timesheets
- **Issues**: 4 nulls, 1 duplicate, 4 date format variations, 4 currency variations

## Expected Results

### Module 1
- All files uploaded successfully
- Correct row/column counts
- Accurate data type inference
- Relationship detection between datasets
- Status changes: PENDING → PROCESSING → READY

### Module 2A (Purification)
- Nulls filled with appropriate strategies
- Duplicates removed without data loss
- Dates normalized to ISO 8601 (YYYY-MM-DD)
- Currencies converted to USD
- Text trimmed and title-cased

### Module 2B (Quality)
- Completeness: ~85-95%
- Consistency: ~90-95%
- Accuracy: ~95-98%
- Quality Grade: B or A
- Risk Level: LOW or MEDIUM

## Validation Criteria

### Production Readiness Checklist

**Module 1:**
- [ ] All file formats parse correctly
- [ ] Column intelligence generates accurate metadata
- [ ] Relationships detected with >80% accuracy
- [ ] No data loss during parsing
- [ ] Error handling for corrupt files

**Module 2A:**
- [ ] Null handling preserves data integrity
- [ ] Duplicate removal is deterministic
- [ ] Date/currency normalization is consistent
- [ ] Audit logs capture all transformations
- [ ] Re-cleaning produces identical results

**Module 2B:**
- [ ] Quality scores are mathematically accurate
- [ ] Outlier detection has <5% false positives
- [ ] Grading aligns with business expectations
- [ ] Column health reflects actual issues
- [ ] Risk levels appropriately warn users

## CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Run VistaraBI Tests
  run: |
    cd tests
    npm install
    npm test
```

Tests exit with code 0 on success, 1 on failure.

## Troubleshooting

**Tests fail with "Authentication failed":**
- Ensure dev server is running on localhost:3000
- Check demo user exists: demo@vistarabi.com / demo123

**Tests timeout:**
- Increase timeout in test files
- Check server logs for errors

**Unexpected quality grades:**
- Review test data expectations
- Verify purification algorithms

## Adding New Tests

1. Create test data in `test-data-generator.ts`
2. Add test method to appropriate suite
3. Update this README with new test count

## Support

For issues or questions about the testing framework, review the implementation details in the test files or check server logs for detailed error messages.
