# VistaraBI API Testing Guide

## Module 4 → Module 5 Integration

### Current Setup:
- **Backend**: http://localhost:5001
- **Frontend**: http://localhost:3000
- **Chart Libraries**: Chart.js + Plotly.js (NOT recharts)

### API Routes (ALL on port 5001):

#### Module 4 - KPI Extraction
```
POST /api/v1/kpi/extract
Body: { cleaningJobId, domainJobId }
Response: { kpiJobId, feasibleKpis, top10Kpis }

POST /api/v1/kpi/select
Body: { kpiJobId, selectedKpiIds: [] }
Response: { status: "confirmed", nextStep: "module_5_dashboard_creation" }
```

#### Module 5 - Dashboard Generation
```
POST /api/dashboard/generate
Body: { datasetId, options: { kpiJobId, selectedKpiIds, domainJobId } }
Response: { success: true, data: { dashboard object } }

GET /api/dashboard/:datasetId
Response: { success: true, data: { dashboard object } }
```

### Test Flow:

**Step 1: Extract KPIs** (happens in Module 4)
```bash
curl -X POST http://localhost:5001/api/v1/kpi/extract ^
  -H "Content-Type: application/json" ^
  -d "{\"cleaningJobId\":\"YOUR_CLEANING_JOB_ID\",\"domainJobId\":\"YOUR_DOMAIN_JOB_ID\"}"
```

**Step 2: Select KPIs** (happens when user clicks checkboxes)
```bash
curl -X POST http://localhost:5001/api/v1/kpi/select ^
  -H "Content-Type: application/json" ^
  -d "{\"kpiJobId\":\"YOUR_KPI_JOB_ID\",\"selectedKpiIds\":[\"retail_revenue_001\",\"retail_orders_002\"]}"
```

**Step 3: Generate Dashboard** (happens when user clicks "Generate Dashboard")
```bash
curl -X POST http://localhost:5001/api/dashboard/generate ^
  -H "Content-Type: application/json" ^
  -d "{\"datasetId\":\"YOUR_CLEANING_JOB_ID\",\"options\":{\"kpiJobId\":\"YOUR_KPI_JOB_ID\"}}"
```

### Chart Library Details:

**Chart.js** (for standard charts):
- Line charts
- Bar charts (vertical & horizontal)
- Pie/Donut charts
- Area charts
- Scatter plots
- Bubble charts

**Plotly.js** (for advanced visualizations):
- Treemap
- Sunburst
- Heatmap
- Box plots
- Violin plots
- Waterfall charts

### Frontend Components:
- `KPICard.tsx` - Uses Chart.js for sparklines
- `ChartContainer.tsx` - Supports all 12 chart types (Chart.js + Plotly)
- `FilterPanel.tsx` - Date/category/numeric filters
- `DrillDownBreadcrumbs.tsx` - Navigation
- `PerformanceMonitor.tsx` - Performance tracking

### Common Issues:

**"TypeError: loggingService.error is not a function"**
- ✅ FIXED: Added info(), error(), warn(), debug() methods to loggingService

**"Port 5001 already in use"**
```powershell
Get-NetTCPConnection -LocalPort 5001 | % { Stop-Process -Id $_.OwningProcess -Force }
```

**"No confirmed KPI job found"**
- Make sure POST /api/v1/kpi/select was called successfully
- Check KPI job status is "confirmed" in database

**Dashboard not displaying**
- Check browser console for errors
- Verify Chart.js and Plotly.js are imported correctly
- Check that component data format matches expected structure
