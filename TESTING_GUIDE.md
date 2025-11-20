# VistaraBI Module 3 Testing Guide

## Quick Start Testing (5 minutes)

### Prerequisites
- Backend running on port 5001 ✅
- Frontend running on port 3000 ✅
- PostgreSQL database connected ✅

### Test Scenario 1: SaaS Domain Detection (High Confidence)

**File:** `test-data/saas_test.csv`

**Steps:**
1. Open http://localhost:3000
2. Click "Upload File" or drag-and-drop `saas_test.csv`
3. Wait for upload completion (10 records)
4. Click "Continue to Cleaning"
5. Auto-detection runs automatically
6. Verify data types detected:
   - `subscription_id`: text
   - `mrr`: numeric
   - `arr`: numeric
   - `churn`: boolean/numeric
7. Click "Start Cleaning"
8. Wait for cleaning completion (~2 seconds)
9. View cleaning report:
   - Records processed: 10
   - Missing values imputed: 0
   - Duplicates removed: 0
   - Outliers detected: 0
10. **Click "Continue to Domain Detection"** (purple button)
11. Wait for domain detection (~100ms)

**Expected Result:**
- ✅ **Domain:** SaaS
- ✅ **Confidence:** 90%+
- ✅ **Decision:** Auto-detect (green UI)
- ✅ **Primary Matches:** subscription_id, mrr, arr, churn, customer_id
- ✅ **Keyword Matches:** Multiple matches shown
- ✅ **UI:** Green gradient with confidence badge
- ✅ **Button:** "Continue with SaaS Domain"

12. Click "Continue with SaaS Domain"
13. Verify success message: "Domain 'SaaS' confirmed successfully! (Module 4 KPI Extraction coming soon)"

---

### Test Scenario 2: Retail Domain Detection (High Confidence)

**File:** `test-data/retail_test.csv`

**Steps:**
1. Upload `retail_test.csv` (10 records)
2. Continue to cleaning
3. Start cleaning
4. View report
5. Click "Continue to Domain Detection"

**Expected Result:**
- ✅ **Domain:** Retail (🏪)
- ✅ **Confidence:** 85%+
- ✅ **Decision:** Auto-detect
- ✅ **Primary Matches:** product_id, sku, category, inventory, units_sold
- ✅ **UI:** Green gradient

---

### Test Scenario 3: Healthcare Domain Detection (High Confidence)

**File:** `test-data/healthcare_test.csv`

**Steps:**
1. Upload `healthcare_test.csv` (10 records)
2. Continue to cleaning
3. Start cleaning
4. View report
5. Click "Continue to Domain Detection"

**Expected Result:**
- ✅ **Domain:** Healthcare (🏥)
- ✅ **Confidence:** 88%+
- ✅ **Decision:** Auto-detect
- ✅ **Primary Matches:** patient_id, diagnosis, provider_id, visit_date
- ✅ **UI:** Green gradient

---

### Test Scenario 4: Medium Confidence (Top-3 Selection)

**File:** Create mixed domain file:
```csv
product_id,subscription_id,price,mrr,category,tier
PROD001,SUB001,299.99,299,Electronics,Premium
PROD002,SUB002,49.99,99,Clothing,Standard
```

**Expected Result:**
- ✅ **Confidence:** 65-84%
- ✅ **Decision:** show_top_3
- ✅ **UI:** Yellow/orange gradient
- ✅ **Options:** Radio buttons for top 3 domains
- ✅ **Button:** "Continue with Selected Domain"

---

### Test Scenario 5: Low Confidence (Manual Selection)

**File:** Create generic file:
```csv
id,name,value,status
1,Item A,100,Active
2,Item B,200,Inactive
```

**Expected Result:**
- ✅ **Confidence:** <65%
- ✅ **Decision:** manual_select
- ✅ **UI:** Gray/blue gradient
- ✅ **Options:** Dropdown with all 8 domains
- ✅ **Button:** "Select a Domain"

---

## API Testing with cURL

### Test Domain Detection API

```bash
# 1. Upload file
curl -X POST http://localhost:5001/api/v1/upload \
  -F "file=@test-data/saas_test.csv"

# Response: { "uploadId": "abc123", ... }

# 2. Start cleaning
curl -X POST http://localhost:5001/api/v1/clean \
  -H "Content-Type: application/json" \
  -d '{
    "uploadId": "abc123",
    "config": {
      "dataTypes": {"subscription_id": "text", "mrr": "numeric", "arr": "numeric"},
      "imputationStrategy": {"mrr": "MEDIAN"},
      "enableOutlierDetection": true,
      "enableDeduplication": true,
      "enableStandardization": true
    }
  }'

# Response: { "jobId": "def456", "status": "running" }

# 3. Wait for cleaning to complete, then detect domain
curl -X POST http://localhost:5001/api/v1/domain/detect \
  -H "Content-Type: application/json" \
  -d '{"cleaningJobId": "def456"}'

# Expected response:
{
  "success": true,
  "data": {
    "domainJobId": "xyz789",
    "domain": "saas",
    "confidence": 90,
    "decision": "auto_detect",
    "primaryMatches": ["subscription_id", "mrr", "arr", "churn", "customer_id"],
    "keywordMatches": ["subscription_id (subscription)", "mrr (mrr)", "arr (arr)"],
    "top3Alternatives": [
      {"domain": "financial", "score": 65},
      {"domain": "retail", "score": 40}
    ]
  }
}

# 4. Confirm domain
curl -X POST http://localhost:5001/api/v1/domain/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "domainJobId": "xyz789",
    "selectedDomain": "saas"
  }'

# Expected response:
{
  "success": true,
  "data": {
    "status": "confirmed",
    "domain": "saas",
    "cleaningJobId": "def456",
    "uploadId": "abc123"
  }
}
```

---

## Verification Checklist

### Backend Verification
- [x] Server running on port 5001
- [x] Domain routes registered (`/api/v1/domain/*`)
- [x] Database migration applied (domain_detection_jobs table exists)
- [x] No console errors on startup

### Frontend Verification
- [x] DomainDetectionPage component exists
- [x] Route `/domain/:jobId` registered in App.tsx
- [x] CleaningReportPage has "Continue to Domain Detection" button
- [x] Download buttons moved to secondary position

### Database Verification
```sql
-- Check table exists
SELECT * FROM domain_detection_jobs;

-- Check schema
\d domain_detection_jobs
```

### File Structure Verification
```
backend/
├── src/
│   ├── controllers/
│   │   └── domainController.js ✅
│   ├── routes/
│   │   └── domain.routes.js ✅
│   └── services/
│       └── domainDetectionService.js ✅

frontend/
├── src/
│   ├── pages/
│   │   └── DomainDetectionPage.tsx ✅
│   └── services/
│       └── domainApi.ts ✅

test-data/
├── saas_test.csv ✅
├── retail_test.csv ✅
└── healthcare_test.csv ✅
```

---

## Troubleshooting

### Issue: Domain detection returns 500 error
**Solution:** Check backend console for Prisma errors. Ensure migration was applied.

### Issue: Confidence always low
**Solution:** Verify test data has correct domain-specific columns (check `domainDetectionService.js` signature columns).

### Issue: UI not showing domain detection page
**Solution:** Check React Router configuration in `App.tsx`. Ensure route `/domain/:jobId` exists.

### Issue: "Continue to Domain Detection" button missing
**Solution:** Verify `CleaningReportPage.tsx` was updated. Check for compilation errors.

---

## Performance Benchmarks

| Operation | Expected Time | Acceptable Range |
|-----------|---------------|------------------|
| Domain Detection | <100ms | 50-200ms |
| UI Render | <50ms | 20-100ms |
| Confidence Calculation | <10ms | 5-20ms |
| Database Insert | <50ms | 20-100ms |

---

## Success Criteria

✅ **Module 3 is complete if:**
1. All 3 test files (SaaS, Retail, Healthcare) detect correctly with ≥85% confidence
2. UI renders all 3 flows (auto-detect, top-3, manual) based on confidence
3. Domain confirmation saves to database successfully
4. No console errors in backend or frontend
5. Flow transitions smoothly: Upload → Clean → Detect Domain → Confirm

---

**Testing Complete!** 🎉

If all scenarios pass, Module 3 is production-ready.
