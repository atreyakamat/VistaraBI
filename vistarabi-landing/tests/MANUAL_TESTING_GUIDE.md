# Manual Testing Guide - VistaraBI Module 1 & 2

## Prerequisites
- Server running on http://localhost:3000
- Demo account: demo@vistarabi.com / demo123
- Test datasets prepared

---

## Test Scenario 1: E-commerce Company (Complete Flow)

### Step 1: Login
1. Navigate to http://localhost:3000/login
2. Enter credentials: demo@vistarabi.com / demo123
3. **Verify:** Redirected to dashboard

### Step 2: Create Project
1. Click "Projects" in navigation
2. Click "New Project"
3. Name: "Acme E-commerce"
4. Description: "Test project for e-commerce data"
5. Click "Create"
6. **Verify:** Project appears in list

### Step 3: Upload Customers Dataset
1. Create CSV file `customers.csv`:
```csv
id,name,email,country,joined
1,John Doe,john@example.com,USA,2024-01-15
2,Jane Smith,jane@example.com,UK,15/02/2024
3,  Bob Johnson  ,,Canada,2024.03.01
4,Alice Lee,alice@example.com,USA,2024-01-20
1,John Doe,john@example.com,USA,2024-01-15
5,,unknown@example.com,Germany,04-15-2024
```

2. Drag file into upload zone
3. **Verify in terminal:**
   - `[Parser] Parsing CSV...`
   - `[Intelligence] Analyzing columns...`
   - `[Purification] Starting purification...`
   - `[Quality] Overall Grade: B`

4. **Verify in UI:**
   - Source status: READY (green)
   - Row count: 5 (1 duplicate removed)
   - Quality grade: B badge
   - "Cleaned" badge visible

### Step 4: Upload Products Dataset
1. Create CSV file `products.csv`:
```csv
id,name,price,category,stock
P001,Laptop,$1299.99,Electronics,45
P002,Mouse,€25.50,Accessories,150
P003,Keyboard,£45.00,accessories,0
P004,Monitor,¥35000,Electronics,30
P005,USB Cable,$9.99,Accessories,500
P006,Headphones,$199.99,,999999
```

2. Upload file
3. **Verify:**
   - Prices normalized to USD
   - Category case standardized
   - Outlier detected (stock: 999999)

### Step 5: Upload Orders Dataset
1. Create JSON file `orders.json`:
```json
[
  {"order_id":"ORD001","customer_id":1,"product_id":"P001","quantity":1,"total":"$1,299.99","order_date":"2024-02-01","status":"Completed"},
  {"order_id":"ORD002","customer_id":2,"product_id":"P002","quantity":2,"total":"€51.00","order_date":"01/02/2024","status":"Shipped"},
  {"order_id":"ORD003","customer_id":3,"product_id":"P003","quantity":null,"total":"£45.00","order_date":"2024-02-03","status":"pending"}
]
```

2. Upload file
3. **Verify:** JSON parsed correctly

### Step 6: View Data Preview
1. Click on "customers.csv" source card
2. **Verify preview shows:**
   - 5 rows (duplicate removed)
   - Clean data (trimmed names, normalized dates)
   - Column types displayed (TEXT, NUMBER, DATE)
   - Null % and Unique % in headers

### Step 7: View Quality Dashboard
1. Click "View Cleaning Summary"
2. **Verify summary shows:**
   - Before: 6 rows → After: 5 rows
   - Nulls filled: 2
   - Duplicates removed: 1
   - Dates normalized: 6
   - Currencies normalized: 0

3. Click "View Quality Dashboard" (if implemented)
4. **Verify dashboard shows:**
   - Completeness: ~83%
   - Consistency: ~95%
   - Accuracy: ~100%
   - Overall Grade: B
   - Risk Level: LOW

### Step 8: View Relationships
1. Click "Relationships" tab
2. **Verify relationships detected:**
   - customers.id → orders.customer_id
   - products.id → orders.product_id

### Step 9: View Column Health
1. In quality dashboard, check Column Health table
2. **Verify each column shows:**
   - Health status (GOOD/PARTIAL/POOR)
   - Completeness %
   - Consistency %
   - Outlier count
   - Issues list

### Step 10: View Audit Log
1. Scroll to Audit Log section
2. **Verify transformations logged:**
   - NULL_FILL (2 affected)
   - DUPLICATE_REMOVE (1 affected)
   - DATE_NORMALIZE (6 affected)
   - TEXT_STANDARDIZE (multiple affected)

### Step 11: Delete Project
1. Click "Delete Project"
2. Confirm deletion
3. **Verify:**
   - Project removed from list
   - All sources deleted
   - Cleaned data deleted
   - Quality records deleted

---

## Test Scenario 2: High Quality Data

### Expected Behavior
- No nulls → 100% completeness
- Consistent formatting → 100% consistency
- No outliers → 100% accuracy
- **Grade A**, **Risk: LOW**

### Test Data
```csv
id,name,value,date
1,Alice,100,2024-01-01
2,Bob,150,2024-01-02
3,Charlie,120,2024-01-03
```

**Expected Results:**
- Grade: A
- Risk: LOW
- Nulls filled: 0
- Duplicates removed: 0

---

## Test Scenario 3: Poor Quality Data

### Expected Behavior
- Many nulls → ~60% completeness
- Inconsistent formats → ~70% consistency
- Some outliers → ~85% accuracy
- **Grade D**, **Risk: MEDIUM**

### Test Data
```csv
id,name,value,date
1,Alice,100,2024-01-01
2,,999999,invalid
3,,,
4,Dave,150,
5,,,2024-01-05
```

**Expected Results:**
- Grade: D or F
- Risk: MEDIUM or HIGH
- Nulls filled: 9
- Outliers detected: 1 (999999)

---

## Validation Checklist

### Module 1: Data Ingestion
- [ ] CSV files upload successfully
- [ ] JSON files upload successfully
- [ ] XML files upload successfully
- [ ] Mixed formats in same project work
- [ ] Row counts are accurate
- [ ] Column counts are accurate
- [ ] Data types inferred correctly
- [ ] Preview shows first 100 rows max
- [ ] Status progresses: PENDING → PROCESSING → READY
- [ ] Failed files show error message
- [ ] Relationships detected correctly
- [ ] Column intelligence shows statistics

### Module 2A: Purification
- [ ] Null values filled appropriately
- [ ] Duplicates removed without data loss
- [ ] Dates normalized to YYYY-MM-DD
- [ ] Currencies converted to USD
- [ ] Text trimmed and standardized
- [ ] Empty columns removed
- [ ] Cleaned badge appears
- [ ] Re-cleaning produces same results
- [ ] Audit log shows all transformations

### Module 2B: Quality Intelligence
- [ ] Completeness score calculated correctly
- [ ] Consistency score calculated correctly
- [ ] Outliers detected (IQR method works)
- [ ] Quality grade matches expectations
- [ ] Risk level appropriate for data
- [ ] Column health accurate
- [ ] Quality dashboard displays all metrics
- [ ] Outliers table shows detected anomalies

### UI/UX
- [ ] Upload zone accepts file drops
- [ ] Progress indicators show during processing
- [ ] Error messages are clear
- [ ] Quality badges visible on cards
- [ ] Modals open and close smoothly
- [ ] Tables are scrollable
- [ ] Data preview responsive
- [ ] No console errors

### Performance
- [ ] Small files (<100 rows) process in <2s
- [ ] Medium files (100-1000 rows) process in <5s
- [ ] Large files (1000-10000 rows) process in <15s
- [ ] UI remains responsive during processing
- [ ] No memory leaks during uploads

---

## Common Issues & Solutions

**Issue:** Files stuck in PROCESSING
- **Check:** Terminal logs for errors
- **Solution:** Restart dev server

**Issue:** Quality grade seems wrong
- **Check:** Expected vs actual scores in quality dashboard
- **Solution:** Review data for hidden issues

**Issue:** Relationships not detected
- **Check:** Column names match (case-insensitive)
- **Solution:** Ensure at least 25% value overlap

**Issue:** Dates not normalized
- **Check:** Date column detected as DATE type
- **Solution:** Ensure dates are parseable

**Issue:** Cleaned badge not showing
- **Check:** Terminal for purification completion logs
- **Solution:** Refresh page to re-fetch cleaned status

---

## Success Criteria

✅ **Module 1 is production-ready when:**
- All file formats parse without errors
- Intelligence analysis completes in <5s
- Relationships detected with >80% accuracy
- Preview tables are accurate

✅ **Module 2 is production-ready when:**
- Purification completes without data loss
- Quality grades align with data reality
- Outlier detection has <5% false positives
- Audit logs provide full transparency
- UI clearly communicates data trust levels

---

## Reporting Issues

When reporting test failures, include:
1. Test scenario name
2. Expected result
3. Actual result
4. Terminal logs
5. Screenshots (if UI issue)
