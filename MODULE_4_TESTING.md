# Module 4 Testing Guide

## Quick Start Testing

### Prerequisites
- Backend running on `http://localhost:5001`
- Frontend running on `http://localhost:3000`
- Database migrated with Module 4 schema

### Test Flow

1. **Upload Dataset** (Module 1)
   - Go to `http://localhost:3000`
   - Upload `Supermarket-Sales-Sample-Data.xlsx` or a retail CSV
   - Note the uploadId

2. **Configure Cleaning** (Module 2)
   - Click "Configure Cleaning"
   - Use auto-configuration
   - Start cleaning job
   - Wait for completion (~4 seconds)

3. **Detect Domain** (Module 3)
   - System auto-navigates to domain detection
   - Should detect **Retail** domain with ~85% confidence
   - Click "Continue with Retail Domain →"

4. **Extract KPIs** (Module 4) ✨ NEW
   - System auto-navigates to `/kpi/:domainJobId`
   - KPI extraction happens automatically
   - Should see:
     - ✅ Summary stats (Total KPIs: 12, Feasible: 8-10)
     - ✅ Top 10 ranked KPIs displayed
     - ✅ Priority badges (Critical/High/Medium)
     - ✅ Completeness percentages (90-100%)
     - ✅ Pre-selected checkboxes for top 10
   - Verify column mapping section shows:
     ```
     order_value ← Total
     quantity ← Quantity
     order_date ← Date
     ```

5. **Select KPIs**
   - Review top-10 recommendations
   - Optionally expand "All Feasible KPIs" section
   - Check/uncheck KPIs as desired
   - Click "Confirm X KPIs & Continue →"
   - Should see success alert (Dashboard creation coming in Module 5)

### API Testing (Postman/cURL)

#### Test KPI Extraction
```bash
curl -X POST http://localhost:5001/api/v1/kpi/extract \
  -H "Content-Type: application/json" \
  -d '{
    "cleaningJobId": 1,
    "domainJobId": 1
  }'
```

Expected response:
```json
{
  "kpiJobId": 1,
  "domain": "retail",
  "totalKpisInLibrary": 12,
  "feasibleCount": 10,
  "infeasibleCount": 2,
  "completenessAverage": 0.92,
  "top10Kpis": [...],
  "allFeasibleKpis": [...],
  "unresolvedColumns": [],
  "canonicalMapping": {
    "order_value": "Total",
    "quantity": "Quantity",
    "order_date": "Date"
  }
}
```

#### Test KPI Library Retrieval
```bash
curl http://localhost:5001/api/v1/kpi/library?domain=retail
```

#### Test KPI Selection
```bash
curl -X POST http://localhost:5001/api/v1/kpi/select \
  -H "Content-Type: application/json" \
  -d '{
    "kpiJobId": 1,
    "selectedKpiIds": ["retail_revenue_001", "retail_units_001"]
  }'
```

### Expected Results by Dataset

#### Supermarket Sales Dataset
- **Feasible KPIs**: 6-8
- **Top KPI**: Total Revenue (100% complete)
- **Also feasible**: Units Sold, Orders Count, AOV
- **Not feasible**: Gross Profit (missing cost data)

#### SaaS Sample Dataset
- **Feasible KPIs**: 7-9
- **Top KPI**: MRR (100% complete)
- **Also feasible**: ARR, ARPA, Churn Rate
- **Not feasible**: CAC (missing marketing/sales spend)

### Troubleshooting

**Problem**: "No feasible KPIs found"
- **Cause**: Column names don't match any synonyms
- **Solution**: Check `canonicalMapping` in response, verify column names

**Problem**: All completeness shows 0%
- **Cause**: Synonym resolution failed
- **Solution**: Add new synonyms to `backend/src/data/synonym-maps/*.json`

**Problem**: Frontend shows "Failed to extract KPIs"
- **Cause**: cleaningJobId or domainJobId is invalid
- **Solution**: Check database for valid IDs, verify API endpoint

**Problem**: Icons not displaying (lucide-react error)
- **Cause**: lucide-react package not installed
- **Solution**: `cd frontend && npm install lucide-react`

### Performance Benchmarks

- KPI extraction: <100ms
- API response time: <200ms
- Frontend rendering: <500ms
- Total user wait time: <1 second

### Success Criteria

✅ At least 5 feasible KPIs found for retail datasets  
✅ Synonym resolution matches 80%+ user columns  
✅ Top-10 KPIs correctly ranked by score  
✅ User can select/deselect KPIs  
✅ Confirmation saves to database  
✅ No console errors in browser or backend  

---

**Next Steps**: After Module 4 testing passes, proceed to **Module 5: Dashboard Creation & Visualization**
