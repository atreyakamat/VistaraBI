# VistaraBI Multi-File Intelligence Pipeline - Testing Guide

## 🚀 System Status

✅ **Backend**: Running on http://localhost:5001  
✅ **Frontend**: Running on http://localhost:3000  
✅ **Database**: PostgreSQL connected  
✅ **Test Data**: 3 CSV files ready  

---

## 📁 Test Data Files

Location: `C:\Projects\VistaraBI\backend\test_data\`

1. **customers.csv** (10 records)
   - Columns: customer_id, name, email, segment, city, country, join_date
   - Primary Key: customer_id (C001-C010)

2. **products.csv** (10 records)
   - Columns: product_id, product_name, category, subcategory, price, cost, supplier
   - Primary Key: product_id (P001-P010)

3. **sales.csv** (20 records)
   - Columns: order_id, customer_id, product_id, order_date, quantity, unit_price, discount, total_amount, shipping_cost, payment_method
   - Foreign Keys: 
     - customer_id → customers.customer_id
     - product_id → products.product_id

---

## 🔄 Complete Pipeline Flow

### 1. **Upload** (`/project/upload`)
**What happens:**
- Upload multiple CSV files
- Create project with metadata
- Files stored in uploads directory
- Records parsed and stored in database

**Expected:**
- Project created with ID
- 3 files uploaded successfully
- Total: 40 records (10+10+20)

---

### 2. **Clean** (`/project/:id/clean`)
**What happens:**
- Clean all files in parallel
- Apply imputation for missing values
- Detect and flag outliers
- Remove duplicate rows
- Generate cleaning report for each file

**Configuration Options:**
- ✅ Auto Imputation (median for numbers, mode for categories)
- ✅ Outlier Detection (IQR method)
- ✅ Deduplication (keep first)

**Expected:**
- All 3 files show "✅ Complete"
- Cleaning reports with before/after stats
- Navigate to domain detection

---

### 3. **Domain Detection** (`/project/:id/domain`)
**What happens:**
- Aggregate columns from ALL files
- Score against domain signatures
- Detect: E-Commerce, Retail, SaaS, etc.
- Show confidence percentage

**Expected Domain:**
- **E-Commerce** or **Retail** (70-90% confidence)
- Keywords matched: customer_id, product_id, order_id, payment_method, shipping

**Action:**
- Confirm domain → Navigate to relationships

---

### 4. **Relationship Detection** (`/project/:id/relationships`)
**What happens:**
- Analyze column names and data types
- Find matching columns across tables
- Validate referential integrity
- Calculate match rates
- Auto-select high-confidence relationships

**Expected Results:**
- **2 Relationships Found:**

  1. **sales.customer_id → customers.customer_id**
     - Match Rate: 100%
     - Status: Valid
     - Type: Foreign Key

  2. **sales.product_id → products.product_id**
     - Match Rate: 100%
     - Status: Valid
     - Type: Foreign Key

**Visual Display:**
- Cards showing table connections
- Match rate percentages
- Checkboxes to select/deselect

**Action:**
- Select both relationships → Click "Create Unified View"

---

### 5. **Unified View Creation** (Background)
**What happens:**
- Generate SQL view with LEFT JOINs
- Combine tables based on relationships
- Store view definition in database

**Generated View Example:**
```sql
CREATE VIEW unified_view_<timestamp> AS
SELECT 
  sales.*,
  customers.name AS customer_name,
  customers.segment AS customer_segment,
  customers.city AS customer_city,
  products.product_name,
  products.category AS product_category,
  products.price AS product_price
FROM sales
LEFT JOIN customers ON sales.customer_id = customers.customer_id
LEFT JOIN products ON sales.product_id = products.product_id
```

**Expected:**
- View created successfully
- Navigate to KPI selection

---

### 6. **KPI Selection** (`/project/:id/kpi`)
**What happens:**
- Extract KPIs from unified view
- Include cross-table metrics
- Categorize by type (aggregation, trend, dimension)

**Expected KPIs (Cross-Table):**
- 💰 Revenue by Customer Segment
- 📊 Sales by Product Category
- 🏆 Top Customers by Order Value
- 📦 Products by Units Sold
- 💳 Revenue by Payment Method
- 🌍 Sales by City

**Action:**
- Select desired KPIs → Click "Generate Dashboard"

---

### 7. **Dashboard** (`/project/:id/dashboard`)
**What happens:**
- Create visualizations for selected KPIs
- Apply Power BI design system
- Show cross-table insights

**Expected Visualizations:**
- KPI cards with values
- Bar charts (horizontal)
- Pie charts for distributions
- Line charts for trends
- Tables for detailed data

**Power BI Styling:**
- Color palette: #01B8AA (teal), #FD625E (coral), #F2C80F (gold)
- Typography: Segoe UI
- Clean white cards with shadows
- Gradient headers

---

## 🧪 Testing Steps

### Step-by-Step Test:

1. **Open Browser:**
   ```
   http://localhost:3000/project/upload
   ```

2. **Upload Files:**
   - Project Name: "E-Commerce Analytics Test"
   - Description: "Testing multi-file intelligence"
   - Select all 3 CSV files from test_data folder
   - Click "Upload Files"

3. **Clean Data:**
   - Review cleaning options (all enabled by default)
   - Click "Clean 3 Files"
   - Wait ~5-10 seconds for completion
   - Verify all show ✅ Complete
   - Click "Continue to Domain Detection"

4. **Confirm Domain:**
   - Check detected domain (E-Commerce/Retail)
   - Review confidence score
   - Click "Confirm and Continue"

5. **Select Relationships:**
   - Verify 2 relationships detected
   - Check both are selected (green checkboxes)
   - Review match rates (should be 100%)
   - Click "Create Unified View (2 relationships)"

6. **Select KPIs:**
   - Browse available KPIs
   - Select cross-table metrics
   - Click "Generate Dashboard"

7. **View Dashboard:**
   - Check KPI cards display values
   - Verify charts render correctly
   - Test interactivity (if implemented)

---

## ✅ Success Criteria

- [ ] All files upload without errors
- [ ] Cleaning completes for all 3 files
- [ ] Domain detected with >50% confidence
- [ ] 2 relationships found with 100% match rates
- [ ] Unified view created successfully
- [ ] Cross-table KPIs extracted
- [ ] Dashboard displays with Power BI styling
- [ ] No console errors in browser
- [ ] Backend logs show no errors

---

## 🐛 Troubleshooting

**Upload fails:**
- Check backend is running on port 5001
- Verify database connection
- Check file permissions in uploads directory

**Cleaning hangs:**
- Check backend console for errors
- Verify cleaning service is imported correctly
- Check database has cleaning_jobs table

**No relationships detected:**
- Verify column names match (customer_id, product_id)
- Check data types are consistent
- Ensure referential integrity (IDs exist in both tables)

**Dashboard doesn't load:**
- Check if KPIs were extracted
- Verify unified view was created
- Check browser console for errors

---

## 📊 Expected Data Flow

```
Upload (40 records)
  ↓
Clean (40 records processed)
  ↓
Domain Detection (E-Commerce 75%)
  ↓
Relationship Detection (2 found)
  ↓
Unified View (20 orders + customer + product data)
  ↓
KPI Extraction (6-10 KPIs)
  ↓
Dashboard (Charts + Cards)
```

---

## 🎯 Key Features to Verify

1. **Multi-file upload** - Multiple files in one project ✓
2. **Parallel cleaning** - All files cleaned simultaneously ✓
3. **Aggregated domain** - Domain detected across all files ✓
4. **Automatic FK detection** - Relationships found without manual config ✓
5. **Unified view** - SQL view with JOINs created ✓
6. **Cross-table KPIs** - Metrics combining multiple tables ✓
7. **Power BI design** - Professional styling throughout ✓

---

## 📝 Notes

- Test data intentionally has 100% referential integrity for clean testing
- Real-world data may have partial matches (70-95%)
- Pipeline is designed to handle failures gracefully
- Each stage can be retried independently
- Progress is saved at each step

---

**Happy Testing! 🚀**
