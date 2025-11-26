# VistaraBI - Test Upload Instructions

## Files to Upload (in this order)

Upload these **3 files** from `backend/test_data/`:

1. ✅ **ideal-workflow-customers.csv** (10 customers)
2. ✅ **ideal-workflow-products.csv** (10 products)  
3. ✅ **ideal-workflow-sales.csv** (20 sales transactions)

## Perfect Relationships

These files have **100% matching foreign keys**:
- `sales.customer_id` → `customers.customer_id` (20/20 matches)
- `sales.product_id` → `products.product_id` (20/20 matches)

## Expected KPIs (23 total available)

After auto-complete, you should see KPIs like:
- **Revenue Metrics**: Total Revenue, Average Order Value
- **Profit Metrics**: Total Profit, Profit Margin %
- **Customer Metrics**: Customer Lifetime Value (CLV), Customer Acquisition Cost (CAC), CLV:CAC Ratio
- **Product Metrics**: Products Sold, Category Revenue, Product Margin
- **Operational**: Return Rate, Shipping Costs, Discount Amount
- **Activity**: Active Customers, Churned Customers

## Workflow

1. **Create Project**: Upload all 3 CSV files
2. **Clean Data**: Click "Clean All" and wait for completion
3. **Auto-Complete**: Click "Auto-Complete" or call `/api/projects/{projectId}/auto-complete`
4. **View Dashboard**: Dashboard with pie chart, line chart, and metrics

## Expected Results

- ✅ Domain: `retail`
- ✅ Relationships: 2 detected (sales→customers, sales→products)
- ✅ Unified View: Created with ~20 rows
- ✅ KPIs: 20+ feasible KPIs
- ✅ Dashboard: 2-3 visualizations + metric cards

## Data Highlights

**Customers:**
- 10 customers (C001-C010)
- Segments: Premium (5), Standard (5)
- Lifetime values: $174 - $2,259
- 1 churned customer (C010)

**Products:**
- 10 products (P001-P010)
- Categories: Electronics (6), Furniture (4)
- Price range: $29.99 - $1,299.99
- Margins: 34-60%

**Sales:**
- 20 transactions (S001-S020)
- Date range: Jan-Oct 2024
- Total revenue: ~$13,000
- 1 return (S008)
- Payment methods: credit_card, paypal, debit_card
