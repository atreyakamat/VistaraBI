/**
 * VistaraBI — Massive Dataset Generator
 * Generates 5 CSV files per domain × 8 domains = 40 files
 * Each file: 1,000,000 rows × 20 columns
 * Uses streaming writes to avoid OOM — writes in 10k-row batches
 *
 * Usage:  node scripts/generate-datasets.mjs [domain] [--all]
 * Example: node scripts/generate-datasets.mjs retail
 *          node scripts/generate-datasets.mjs --all
 */

import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'test-datasets');
const ROWS = 1_000_000;
const BATCH = 10_000;

// ── Deterministic pseudo-random (fast, no dep) ───────────────────────────────
let seed = 42;
function rand() { seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF; return Math.abs(seed) / 0x7FFFFFFF; }
function randInt(min, max) { return Math.floor(rand() * (max - min + 1)) + min; }
function randFloat(min, max, dp = 2) { return +(rand() * (max - min) + min).toFixed(dp); }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function date(daysBack = 730) {
    const d = new Date(Date.now() - randInt(0, daysBack) * 86400000);
    return d.toISOString().split('T')[0];
}
function id(prefix = 'ID') { return `${prefix}_${String(randInt(100000, 999999))}`; }

// ── Domain schema definitions ────────────────────────────────────────────────

const SCHEMAS = {

    retail: [
        {
            name: 'sales_transactions',
            header: 'transaction_id,date,store_id,store_region,product_id,product_name,category,sub_category,brand,quantity,unit_price,discount_pct,revenue,cost,margin,payment_method,customer_id,customer_segment,return_flag,channel',
            row: () => {
                const qty = randInt(1, 20);
                const price = randFloat(5, 500);
                const disc = randFloat(0, 0.4, 3);
                const rev = +(qty * price * (1 - disc)).toFixed(2);
                const cost = +(rev * randFloat(0.4, 0.75, 3)).toFixed(2);
                return [
                    id('TXN'), date(), id('STR'), pick(['North','South','East','West','Central']),
                    id('PRD'), pick(['Laptop','Shirt','Milk','Sofa','Watch','Pen','Jeans','Shoes']),
                    pick(['Electronics','Apparel','Grocery','Furniture','Accessories']),
                    pick(['Premium','Standard','Budget']),
                    pick(['Apple','Nike','Amul','IKEA','Titan','Parker']),
                    qty, price, disc, rev, cost, +(rev - cost).toFixed(2),
                    pick(['Cash','Card','UPI','NetBanking']),
                    id('CUS'), pick(['Retail','Wholesale','Online']),
                    pick(['Y','N','N','N','N']), pick(['In-store','Online','App'])
                ].join(',');
            }
        },
        {
            name: 'inventory',
            header: 'inventory_id,date,warehouse_id,warehouse_city,product_id,product_name,category,sku,stock_on_hand,reorder_point,reorder_qty,avg_daily_sales,days_of_supply,unit_cost,total_inventory_value,supplier_id,lead_time_days,last_received_date,expiry_date,status',
            row: () => {
                const stock = randInt(0, 5000);
                const cost = randFloat(5, 300);
                return [
                    id('INV'), date(), id('WH'), pick(['Mumbai','Delhi','Bangalore','Chennai','Hyderabad']),
                    id('PRD'), pick(['Laptop','Shirt','Milk','Sofa','Watch']),
                    pick(['Electronics','Apparel','Grocery','Furniture']),
                    `SKU-${randInt(10000,99999)}`, stock, randInt(50, 500), randInt(100, 1000),
                    randFloat(1, 50), randInt(1, 90), cost, +(stock * cost).toFixed(2),
                    id('SUP'), randInt(3, 30), date(30), date(-30),
                    pick(['Active','Low','Critical','Overstock'])
                ].join(',');
            }
        },
        {
            name: 'customer_orders',
            header: 'order_id,order_date,customer_id,customer_name,customer_city,customer_state,customer_tier,age_group,gender,product_id,category,quantity,unit_price,total_amount,shipping_cost,delivery_days,order_status,return_requested,loyalty_points,acquisition_channel',
            row: () => {
                const qty = randInt(1, 10);
                const price = randFloat(10, 1000);
                return [
                    id('ORD'), date(), id('CUS'),
                    pick(['Rahul Sharma','Priya Singh','Amit Kumar','Neha Gupta','Raj Patel']),
                    pick(['Mumbai','Delhi','Pune','Bangalore','Jaipur']),
                    pick(['MH','DL','KA','RJ','GJ','TN','UP']),
                    pick(['Gold','Silver','Bronze','Platinum']),
                    pick(['18-24','25-34','35-44','45-54','55+']),
                    pick(['M','F','Other']),
                    id('PRD'), pick(['Electronics','Apparel','Grocery','Books','Sports']),
                    qty, price, +(qty * price).toFixed(2), randFloat(0, 150),
                    randInt(1, 10), pick(['Delivered','Processing','Shipped','Cancelled','Returned']),
                    pick(['Y','N','N','N']), randInt(0, 5000),
                    pick(['Social Media','Search','Email','Referral','Direct'])
                ].join(',');
            }
        },
        {
            name: 'product_catalog',
            header: 'product_id,product_name,category,sub_category,brand,sku,base_price,sale_price,cost_price,margin_pct,weight_kg,rating,review_count,launch_date,status,supplier_id,country_of_origin,is_perishable,shelf_life_days,reorder_level',
            row: () => {
                const cost = randFloat(5, 400);
                const sale = +(cost * randFloat(1.2, 3)).toFixed(2);
                const base = +(sale * randFloat(1.0, 1.3)).toFixed(2);
                return [
                    id('PRD'), pick(['Pro Laptop X1','Cotton Tee','Greek Yogurt','Ergonomic Chair','Smart Watch']),
                    pick(['Electronics','Apparel','Grocery','Furniture','Accessories']),
                    pick(['Computers','T-Shirts','Dairy','Seating','Wearables']),
                    pick(['TechBrand','FashionCo','FreshFarm','ComfortPlus','TimePiece']),
                    `SKU-${randInt(10000,99999)}`,
                    base, sale, cost, +((sale - cost) / sale * 100).toFixed(1),
                    randFloat(0.1, 30), randFloat(1, 5, 1), randInt(0, 10000),
                    date(1800), pick(['Active','Discontinued','Draft','Seasonal']),
                    id('SUP'), pick(['India','China','USA','Germany','Japan']),
                    pick(['Y','N']), randInt(0, 365), randInt(10, 500)
                ].join(',');
            }
        },
        {
            name: 'store_performance',
            header: 'record_id,date,store_id,store_name,region,city,store_size_sqft,manager_id,daily_footfall,transactions,revenue,avg_basket_size,conversion_rate,return_rate,staff_count,operating_hours,electricity_units,rent_monthly,shrinkage_pct,nps_score',
            row: () => {
                const footfall = randInt(50, 3000);
                const conv = randFloat(0.1, 0.6, 3);
                const txns = Math.floor(footfall * conv);
                const rev = +(txns * randFloat(200, 3000)).toFixed(2);
                return [
                    id('REC'), date(), id('STR'),
                    pick(['BigMart Central','QuickStop Mall','FreshMart','TechZone','StyleHub']),
                    pick(['North','South','East','West']),
                    pick(['Mumbai','Delhi','Bangalore','Pune','Chennai']),
                    randInt(1000, 50000), id('MGR'), footfall, txns, rev,
                    +(rev / (txns || 1)).toFixed(2), conv,
                    randFloat(0.01, 0.12, 3), randInt(5, 80),
                    randInt(8, 24), randInt(500, 8000), randInt(50000, 500000),
                    randFloat(0.001, 0.05, 3), randInt(20, 90)
                ].join(',');
            }
        }
    ],

    saas: [
        {
            name: 'user_events',
            header: 'event_id,timestamp,user_id,session_id,account_id,plan_tier,event_type,feature_name,page_url,device_type,os,browser,country,latency_ms,error_flag,experiment_group,referrer,duration_seconds,clicks,scroll_depth_pct',
            row: () => [
                id('EVT'), new Date(Date.now() - randInt(0,63072000000)).toISOString(),
                id('USR'), id('SES'), id('ACC'),
                pick(['free','starter','pro','enterprise']),
                pick(['page_view','button_click','feature_use','export','share','search','login','logout']),
                pick(['Dashboard','Reports','AI Chat','Forecast','Upload','Settings','Billing']),
                `/app/${pick(['dashboard','reports','ai','forecast','upload','settings'])}`,
                pick(['Desktop','Mobile','Tablet']),
                pick(['Windows','macOS','Linux','iOS','Android']),
                pick(['Chrome','Firefox','Safari','Edge']),
                pick(['IN','US','GB','DE','SG','AU','CA']),
                randInt(10, 5000), pick(['false','false','false','true']),
                pick(['control','variant_a','variant_b']),
                pick(['google','direct','email','linkedin','']),
                randInt(1, 600), randInt(1, 50), randInt(10, 100)
            ].join(',')
        },
        {
            name: 'subscriptions',
            header: 'subscription_id,account_id,company_name,industry,employee_count,plan_tier,mrr,arr,start_date,renewal_date,status,seats_purchased,seats_used,discount_pct,billing_cycle,payment_method,csm_id,health_score,churn_risk_score,lifetime_value',
            row: () => {
                const mrr = randFloat(49, 9999);
                const seats = randInt(1, 500);
                return [
                    id('SUB'), id('ACC'),
                    pick(['Acme Corp','TechFlow','DataSync','CloudBase','InnovateCo']),
                    pick(['SaaS','FinTech','Healthcare','Retail','Manufacturing']),
                    randInt(10, 50000), pick(['starter','pro','business','enterprise']),
                    mrr, +(mrr * 12).toFixed(2), date(1800), date(-365),
                    pick(['active','active','active','churned','paused','trialing']),
                    seats, randInt(1, seats), randFloat(0, 0.4, 2),
                    pick(['monthly','annual']),
                    pick(['Card','ACH','Wire','Invoice']),
                    id('CSM'), randInt(1, 100), randFloat(0, 1, 2),
                    +(mrr * randInt(12, 48)).toFixed(2)
                ].join(',');
            }
        },
        {
            name: 'mrr_movements',
            header: 'movement_id,date,account_id,company_name,plan_from,plan_to,movement_type,mrr_before,mrr_after,mrr_change,seats_before,seats_after,reason_code,csm_id,country,industry,deal_source,arr_impact,churned_at,expansion_flag',
            row: () => {
                const before = randFloat(49, 5000);
                const after = randFloat(49, 9999);
                return [
                    id('MOV'), date(), id('ACC'),
                    pick(['Acme','TechFlow','DataSync','CloudBase']),
                    pick(['free','starter','pro','enterprise']),
                    pick(['starter','pro','business','enterprise']),
                    pick(['new_business','expansion','contraction','churn','reactivation']),
                    before, after, +(after - before).toFixed(2),
                    randInt(1, 100), randInt(1, 200),
                    pick(['price_increase','feature_need','competition','budget','growth']),
                    id('CSM'),
                    pick(['IN','US','GB','DE','SG']),
                    pick(['SaaS','FinTech','Healthcare','Retail']),
                    pick(['inbound','outbound','partner','self-serve']),
                    +((after - before) * 12).toFixed(2),
                    pick(['','','','', date(90)]),
                    pick(['true','false','false','false'])
                ].join(',');
            }
        },
        {
            name: 'support_tickets',
            header: 'ticket_id,created_at,resolved_at,account_id,plan_tier,severity,category,sub_category,status,first_response_mins,resolution_hours,csat_score,agent_id,escalated,affected_feature,environment,bug_confirmed,workaround_available,reopened,sla_breached',
            row: () => {
                const created = new Date(Date.now() - randInt(0, 31536000000));
                const resHours = randFloat(0.5, 72);
                const resolved = new Date(created.getTime() + resHours * 3600000).toISOString();
                return [
                    id('TKT'), created.toISOString(), resolved,
                    id('ACC'), pick(['free','starter','pro','enterprise']),
                    pick(['low','medium','high','critical']),
                    pick(['Bug','Feature Request','How-to','Billing','Performance']),
                    pick(['UI','API','Data','Auth','Export','Integration']),
                    pick(['resolved','open','pending','closed']),
                    randInt(1, 480), resHours,
                    pick(['1','2','3','4','5','','']),
                    id('AGT'), pick(['false','false','true']),
                    pick(['Dashboard','AI Chat','Upload','Reports','Billing']),
                    pick(['production','staging']),
                    pick(['true','false','false']),
                    pick(['true','false']),
                    pick(['false','false','true']),
                    pick(['false','false','true'])
                ].join(',');
            }
        },
        {
            name: 'feature_usage',
            header: 'usage_id,date,account_id,user_id,plan_tier,feature_name,module,usage_count,active_minutes,api_calls,exports_count,shares_count,errors_count,country,device,team_size,days_since_signup,days_to_renewal,is_power_user,engagement_score',
            row: () => [
                id('USE'), date(), id('ACC'), id('USR'),
                pick(['free','starter','pro','enterprise']),
                pick(['AI Chat','Dashboard','Forecast','Upload','Reports','Strategy']),
                pick(['Module 1','Module 3','Module 5','Module 7','Module 8','Module 9']),
                randInt(1, 200), randInt(1, 480), randInt(0, 5000),
                randInt(0, 50), randInt(0, 30), randInt(0, 20),
                pick(['IN','US','GB','DE','SG']),
                pick(['Desktop','Mobile','Tablet']),
                randInt(1, 500), randInt(1, 730), randInt(1, 365),
                pick(['true','false','false','false']),
                randFloat(0, 100, 1)
            ].join(',')
        }
    ],

    finance: [
        {
            name: 'transactions',
            header: 'txn_id,date,account_id,account_type,customer_id,txn_type,amount,currency,exchange_rate,inr_amount,merchant_name,merchant_category,city,country,channel,status,fraud_flag,processing_fee,balance_after,reference_no',
            row: () => {
                const amt = randFloat(100, 500000);
                const rate = randFloat(0.8, 85);
                return [
                    id('TXN'), date(), id('ACC'),
                    pick(['Savings','Current','Credit','Demat','Loan']),
                    id('CUS'),
                    pick(['Credit','Debit','Transfer','EMI','Refund','Fee']),
                    amt, pick(['INR','USD','EUR','GBP']), rate,
                    +(amt / rate).toFixed(2),
                    pick(['Amazon','Zomato','Uber','HDFC','Reliance','Tata']),
                    pick(['E-commerce','Food','Transport','Banking','Retail','Utilities']),
                    pick(['Mumbai','Delhi','Bangalore','Chennai']),
                    pick(['IN','US','UK','SG']),
                    pick(['Net Banking','UPI','NEFT','RTGS','Card','Cash']),
                    pick(['Success','Failed','Pending','Reversed']),
                    pick(['false','false','false','true']),
                    randFloat(0, 500), randFloat(1000, 10000000),
                    `REF${randInt(1000000, 9999999)}`
                ].join(',');
            }
        },
        {
            name: 'portfolio',
            header: 'holding_id,date,portfolio_id,investor_id,asset_class,instrument_name,ticker,isin,quantity,avg_buy_price,current_price,market_value,unrealized_pnl,realized_pnl,weight_pct,sector,exchange,currency,beta,pe_ratio',
            row: () => {
                const qty = randInt(1, 10000);
                const buy = randFloat(10, 5000);
                const curr = randFloat(5, 8000);
                const mktVal = +(qty * curr).toFixed(2);
                return [
                    id('HLD'), date(), id('PRT'), id('INV'),
                    pick(['Equity','Debt','Gold','Real Estate','MF','ETF']),
                    pick(['Reliance','Infosys','TCS','HDFC Bank','ITC','Wipro']),
                    pick(['RELIANCE','INFY','TCS','HDFCBANK','ITC','WIPRO']),
                    `INE${randInt(100,999)}${pick(['A','B','C'])}01`,
                    qty, buy, curr, mktVal,
                    +(mktVal - qty * buy).toFixed(2),
                    randFloat(-50000, 200000),
                    randFloat(0, 25, 2),
                    pick(['Technology','Finance','Energy','Healthcare','Consumer']),
                    pick(['NSE','BSE','NYSE']),
                    pick(['INR','USD']),
                    randFloat(0.2, 2.5, 2), randFloat(5, 80, 1)
                ].join(',');
            }
        },
        {
            name: 'risk_metrics',
            header: 'metric_id,date,portfolio_id,var_95,var_99,cvar_95,max_drawdown,sharpe_ratio,sortino_ratio,beta,alpha,correlation_to_nifty,volatility_annualized,tracking_error,information_ratio,treynor_ratio,calmar_ratio,omega_ratio,skewness,kurtosis',
            row: () => [
                id('RMT'), date(), id('PRT'),
                randFloat(-500000, 0), randFloat(-800000, 0), randFloat(-1000000, 0),
                randFloat(-0.5, 0, 3), randFloat(-1, 4, 3), randFloat(-1, 5, 3),
                randFloat(0.1, 2, 3), randFloat(-0.1, 0.3, 4),
                randFloat(0.3, 0.95, 3), randFloat(0.05, 0.5, 3),
                randFloat(0.01, 0.2, 3), randFloat(-2, 3, 3),
                randFloat(-1, 5, 3), randFloat(-2, 5, 3), randFloat(0.5, 2, 3),
                randFloat(-2, 2, 3), randFloat(1, 10, 3)
            ].join(',')
        },
        {
            name: 'loan_book',
            header: 'loan_id,disbursement_date,customer_id,loan_type,principal_amount,interest_rate,tenure_months,emi_amount,outstanding_balance,paid_installments,overdue_days,dpd_bucket,credit_score,ltv_ratio,collateral_value,state,employment_type,annual_income,npa_flag,write_off_flag',
            row: () => {
                const principal = randInt(50000, 10000000);
                const rate = randFloat(7, 24);
                const tenure = randInt(12, 360);
                const emi = +(principal * rate / 1200 / (1 - Math.pow(1 + rate / 1200, -tenure))).toFixed(2);
                return [
                    id('LON'), date(1800), id('CUS'),
                    pick(['Home Loan','Personal Loan','Business Loan','Auto Loan','Education Loan']),
                    principal, rate, tenure, emi,
                    +(principal * rand()).toFixed(2), randInt(0, tenure),
                    randInt(0, 180),
                    pick(['0','1-30','31-60','61-90','91-180','180+']),
                    randInt(300, 900), randFloat(0.3, 0.9, 3),
                    +(principal * randFloat(1.2, 3)).toFixed(0),
                    pick(['MH','DL','KA','GJ','TN','UP','RJ']),
                    pick(['Salaried','Self-Employed','Business Owner']),
                    randInt(180000, 10000000),
                    pick(['false','false','false','true']),
                    pick(['false','false','true'])
                ].join(',');
            }
        },
        {
            name: 'market_data',
            header: 'record_id,date,ticker,exchange,open_price,high_price,low_price,close_price,adj_close,volume,turnover,market_cap,pe_ratio,pb_ratio,dividend_yield,52w_high,52w_low,rsi_14,macd_signal,ema_20',
            row: () => {
                const close = randFloat(10, 8000);
                return [
                    id('MKT'), date(1825), pick(['RELIANCE','INFY','TCS','HDFCBANK','ITC','WIPRO','BAJFINANCE']),
                    pick(['NSE','BSE']),
                    +(close * randFloat(0.97, 1.02)).toFixed(2),
                    +(close * randFloat(1.0, 1.05)).toFixed(2),
                    +(close * randFloat(0.95, 1.0)).toFixed(2),
                    close, +(close * randFloat(0.99, 1.01)).toFixed(2),
                    randInt(100000, 50000000),
                    randInt(10000000, 5000000000),
                    randInt(1000000000, 10000000000000),
                    randFloat(5, 80, 1), randFloat(0.5, 20, 2),
                    randFloat(0, 5, 2),
                    +(close * randFloat(1.0, 1.5)).toFixed(2),
                    +(close * randFloat(0.5, 1.0)).toFixed(2),
                    randFloat(20, 80, 1), randFloat(-50, 50, 2),
                    +(close * randFloat(0.97, 1.03)).toFixed(2)
                ].join(',');
            }
        }
    ],

    healthcare: [
        {
            name: 'patient_encounters',
            header: 'encounter_id,encounter_date,patient_id,age,gender,blood_group,department,doctor_id,encounter_type,chief_complaint,diagnosis_code,diagnosis_desc,severity,admission_date,discharge_date,los_days,discharge_disposition,insurance_type,bill_amount,paid_amount',
            row: () => {
                const admit = new Date(Date.now() - randInt(1, 365) * 86400000);
                const los = randInt(0, 30);
                const discharge = new Date(admit.getTime() + los * 86400000).toISOString().split('T')[0];
                const bill = randFloat(500, 500000);
                return [
                    id('ENC'), admit.toISOString().split('T')[0], id('PAT'),
                    randInt(1, 90), pick(['M','F','Other']),
                    pick(['A+','A-','B+','B-','O+','O-','AB+','AB-']),
                    pick(['Cardiology','Neurology','Orthopedics','Pediatrics','Emergency','General Medicine']),
                    id('DOC'),
                    pick(['Inpatient','Outpatient','Emergency','Day Care']),
                    pick(['Chest pain','Fever','Fracture','Headache','Diabetes check','Maternity']),
                    `I${randInt(10,99)}.${randInt(0,9)}`,
                    pick(['Type 2 Diabetes','Hypertension','COPD','Appendicitis','Dengue','Fracture']),
                    pick(['Low','Moderate','High','Critical']),
                    admit.toISOString().split('T')[0], discharge, los,
                    pick(['Home','Transfer','LAMA','Deceased','Rehab']),
                    pick(['Govt','Private','Corporate','Self-Pay','Mediclaim']),
                    bill, +(bill * randFloat(0.4, 1.0)).toFixed(2)
                ].join(',');
            }
        },
        {
            name: 'lab_results',
            header: 'result_id,test_date,patient_id,encounter_id,lab_id,test_code,test_name,panel,result_value,unit,normal_min,normal_max,is_abnormal,critical_flag,collected_by,analysed_by,turnaround_hours,instrument_id,sample_type,quality_flag',
            row: () => {
                const min = randFloat(0, 50);
                const max = min + randFloat(1, 100);
                const val = randFloat(min * 0.5, max * 1.5);
                return [
                    id('RES'), date(), id('PAT'), id('ENC'), id('LAB'),
                    `TST${randInt(1000,9999)}`,
                    pick(['HbA1c','Hemoglobin','Creatinine','TSH','Blood Glucose','Bilirubin','CBC']),
                    pick(['Biochemistry','Hematology','Microbiology','Immunology']),
                    +val.toFixed(2), pick(['mg/dL','g/dL','mmol/L','IU/L','%','cells/μL']),
                    +min.toFixed(2), +max.toFixed(2),
                    val < min || val > max ? 'true' : 'false',
                    (val < min * 0.5 || val > max * 1.5) ? 'true' : 'false',
                    id('MLT'), id('LAB'), randFloat(0.5, 24, 1),
                    `INST${randInt(100,999)}`,
                    pick(['Blood','Urine','Swab','CSF','Tissue']),
                    pick(['Accept','Accept','Accept','Reject'])
                ].join(',');
            }
        },
        {
            name: 'medication_orders',
            header: 'order_id,order_date,patient_id,encounter_id,doctor_id,drug_name,drug_class,generic_name,dose_mg,frequency,route,duration_days,dispensed_qty,unit_cost,total_cost,pharmacy_id,dispensed_flag,adverse_reaction,interaction_flag,adherence_score',
            row: () => {
                const dose = randFloat(5, 1000, 0);
                const qty = randInt(1, 90);
                const cost = randFloat(1, 500);
                return [
                    id('ORD'), date(), id('PAT'), id('ENC'), id('DOC'),
                    pick(['Metformin','Atorvastatin','Amlodipine','Azithromycin','Pantoprazole','Aspirin']),
                    pick(['Antidiabetic','Statin','Antihypertensive','Antibiotic','PPI','Antiplatelet']),
                    pick(['Metformin HCl','Atorvastatin Calcium','Amlodipine Besylate']),
                    dose, pick(['OD','BD','TDS','QID','SOS']),
                    pick(['Oral','IV','IM','Topical','Inhaled']),
                    randInt(3, 90), qty, cost, +(qty * cost).toFixed(2),
                    id('PHR'), pick(['true','false']),
                    pick(['None','None','None','Nausea','Rash','Dizziness']),
                    pick(['false','false','false','true']),
                    randInt(0, 100)
                ].join(',');
            }
        },
        {
            name: 'clinical_staff',
            header: 'staff_id,record_date,department,staff_type,shift,scheduled_hours,actual_hours,overtime_hours,patients_seen,procedures_done,consultations,bed_occupancy_pct,avg_wait_mins,patient_satisfaction,incidents_reported,sick_leaves,leaves_taken,training_hours,certifications_due,performance_score',
            row: () => [
                id('STF'), date(),
                pick(['ICU','Emergency','OPD','Surgery','Radiology','Laboratory']),
                pick(['Doctor','Nurse','Technician','Admin','Support']),
                pick(['Morning','Evening','Night']),
                8, randFloat(6, 12, 1), randFloat(0, 4, 1),
                randInt(0, 50), randInt(0, 20), randInt(0, 30),
                randFloat(50, 100, 1), randInt(5, 120),
                randFloat(1, 5, 1), randInt(0, 5), randInt(0, 10),
                randInt(0, 30), randFloat(0, 40, 1), randInt(0, 5),
                randInt(0, 100)
            ].join(',')
        },
        {
            name: 'insurance_claims',
            header: 'claim_id,claim_date,patient_id,insurer_id,policy_number,claim_type,diagnosis_code,procedure_code,claimed_amount,approved_amount,settled_amount,rejection_reason,processing_days,hospital_id,doctor_id,pre_auth_obtained,cashless_flag,tpa_id,fraud_score,claim_status',
            row: () => {
                const claimed = randFloat(1000, 500000);
                const approved = +(claimed * randFloat(0.5, 1.0)).toFixed(2);
                return [
                    id('CLM'), date(), id('PAT'), id('INS'),
                    `POL${randInt(1000000,9999999)}`,
                    pick(['Hospitalization','OPD','Surgery','Maternity','Critical Illness']),
                    `I${randInt(10,99)}.${randInt(0,9)}`,
                    `CPT${randInt(10000,99999)}`,
                    claimed, approved, +(approved * randFloat(0.9, 1.0)).toFixed(2),
                    pick(['','','','Pre-auth missing','Policy lapsed','Exclusion']),
                    randInt(1, 60), id('HSP'), id('DOC'),
                    pick(['true','false']), pick(['true','false']),
                    id('TPA'), randFloat(0, 1, 3),
                    pick(['Approved','Pending','Rejected','Under Review','Settled'])
                ].join(',');
            }
        }
    ],

    manufacturing: [
        {
            name: 'production_orders',
            header: 'order_id,order_date,plant_id,plant_city,product_code,product_name,batch_number,planned_qty,actual_qty,yield_pct,planned_start,actual_start,planned_end,actual_end,cycle_time_mins,machine_id,operator_id,shift,defect_count,status',
            row: () => {
                const planned = randInt(100, 10000);
                const actual = randInt(80, planned);
                return [
                    id('PO'), date(), id('PLT'),
                    pick(['Pune','Chennai','Ahmedabad','Coimbatore','Ludhiana']),
                    id('PROD'),
                    pick(['Gear Assembly','Circuit Board','Steel Rod','Plastic Mould','Engine Part']),
                    `BAT${randInt(100000,999999)}`,
                    planned, actual, +(actual / planned * 100).toFixed(1),
                    date(30), date(30), date(-5), date(-5),
                    randFloat(30, 480), id('MCH'), id('OPR'),
                    pick(['A','B','C']), randInt(0, actual * 0.05 | 0),
                    pick(['Completed','In Progress','On Hold','Rejected'])
                ].join(',');
            }
        },
        {
            name: 'machine_telemetry',
            header: 'telemetry_id,timestamp,machine_id,plant_id,product_code,temperature_c,pressure_bar,vibration_mm_s,rpm,power_kw,feed_rate,coolant_flow,tool_wear_pct,cycle_count,oee_score,availability,performance,quality_rate,alarm_code,maintenance_due',
            row: () => [
                id('TEL'), new Date(Date.now() - randInt(0, 31536000000)).toISOString(),
                id('MCH'), id('PLT'), id('PROD'),
                randFloat(20, 300, 1), randFloat(0.5, 20, 2),
                randFloat(0, 10, 3), randInt(100, 5000),
                randFloat(5, 200, 1), randFloat(0.1, 5, 3),
                randFloat(0.5, 10, 2), randFloat(0, 100, 1),
                randInt(0, 100000), randFloat(0, 100, 1),
                randFloat(0, 100, 1), randFloat(0, 100, 1), randFloat(0, 100, 1),
                pick(['NONE','NONE','NONE','TEMP_HIGH','VIBR_HIGH','POWER_LOW']),
                pick(['false','false','true'])
            ].join(',')
        },
        {
            name: 'quality_inspection',
            header: 'inspection_id,inspection_date,batch_number,product_code,plant_id,inspector_id,sample_size,passed_count,failed_count,defect_rate,defect_type,measurement_value,spec_min,spec_max,cpk_value,test_method,disposition,rework_count,scrap_count,customer_complaint',
            row: () => {
                const sample = randInt(50, 500);
                const failed = randInt(0, sample * 0.1 | 0);
                const spec_min = randFloat(9.8, 10, 3);
                const spec_max = randFloat(10, 10.2, 3);
                return [
                    id('QI'), date(), `BAT${randInt(100000,999999)}`, id('PROD'), id('PLT'), id('INS'),
                    sample, sample - failed, failed, +(failed / sample * 100).toFixed(2),
                    pick(['None','Dimensional','Surface','Material','Functional']),
                    randFloat(9.7, 10.3, 4), spec_min, spec_max,
                    randFloat(0.5, 2.5, 3),
                    pick(['CMM','Visual','Hardness Test','Tensile Test','Chemical Analysis']),
                    pick(['Accept','Reject','Rework','Concession']),
                    randInt(0, failed), randInt(0, failed),
                    pick(['false','false','false','true'])
                ].join(',');
            }
        },
        {
            name: 'supply_chain',
            header: 'record_id,date,supplier_id,supplier_name,material_code,material_name,purchase_order,ordered_qty,received_qty,unit_cost,total_cost,lead_time_days,on_time_flag,quality_score,rejection_qty,warehouse_id,stock_level,reorder_point,days_of_stock,criticality',
            row: () => {
                const ordered = randInt(100, 50000);
                const received = randInt(80, ordered);
                const cost = randFloat(5, 5000);
                return [
                    id('SC'), date(), id('SUP'),
                    pick(['Steel India Ltd','Polymer Corp','Electronics Hub','Castings Ltd']),
                    id('MAT'),
                    pick(['Steel Sheet','ABS Plastic','Copper Wire','Cast Iron','Rubber Seal']),
                    id('PO'), ordered, received, cost, +(received * cost).toFixed(2),
                    randInt(1, 60), pick(['true','true','true','false']),
                    randInt(60, 100), randInt(0, ordered - received),
                    id('WH'), randInt(0, 100000), randInt(1000, 10000),
                    randInt(1, 90),
                    pick(['A','A','B','B','C'])
                ].join(',');
            }
        },
        {
            name: 'maintenance_log',
            header: 'log_id,date,machine_id,plant_id,maintenance_type,technician_id,planned_flag,downtime_hours,parts_replaced,parts_cost,labour_hours,labour_cost,total_cost,root_cause,corrective_action,next_due_date,priority,failure_mode,mtbf_hours,mttr_hours',
            row: () => {
                const parts = randFloat(0, 50000);
                const labour = randFloat(500, 20000);
                return [
                    id('ML'), date(), id('MCH'), id('PLT'),
                    pick(['Preventive','Corrective','Predictive','Breakdown']),
                    id('TEC'), pick(['true','false']),
                    randFloat(0.5, 48, 1),
                    pick(['None','Bearing','Belt','Filter','Sensor','Motor']),
                    parts, randFloat(1, 16, 1), labour, +(parts + labour).toFixed(2),
                    pick(['Wear','Fatigue','Overheating','Misalignment','Contamination']),
                    pick(['Replace part','Lubricate','Calibrate','Clean','Adjust']),
                    date(-90), pick(['P1','P2','P3']),
                    pick(['Bearing failure','Belt wear','Sensor drift','Seal leak']),
                    randInt(100, 10000), randFloat(0.5, 24, 1)
                ].join(',');
            }
        }
    ],

    ecommerce: [
        {
            name: 'orders',
            header: 'order_id,order_date,customer_id,customer_city,customer_state,product_id,product_name,category,seller_id,seller_city,quantity,unit_price,discount,gmv,platform_fee,seller_payout,shipping_cost,delivery_days,order_status,return_flag',
            row: () => {
                const qty = randInt(1, 10);
                const price = randFloat(50, 50000);
                const disc = randFloat(0, 0.5, 3);
                const gmv = +(qty * price * (1 - disc)).toFixed(2);
                return [
                    id('ORD'), date(), id('CUS'),
                    pick(['Mumbai','Delhi','Bangalore','Hyderabad','Pune']),
                    pick(['MH','DL','KA','AP','GJ']),
                    id('PRD'),
                    pick(['iPhone 15','Adidas Shoes','Kindle','Mixer Grinder','Air Purifier']),
                    pick(['Electronics','Fashion','Books','Appliances','Home']),
                    id('SEL'),
                    pick(['Mumbai','Surat','Kolkata','Jaipur','Tiruppur']),
                    qty, price, disc, gmv,
                    +(gmv * 0.025).toFixed(2), +(gmv * 0.95).toFixed(2),
                    randFloat(0, 200), randInt(1, 10),
                    pick(['Delivered','Shipped','Processing','Cancelled','Returned']),
                    pick(['false','false','false','true'])
                ].join(',');
            }
        },
        {
            name: 'product_listings',
            header: 'listing_id,created_date,product_id,seller_id,category,sub_category,title,brand,mrp,selling_price,discount_pct,rating,reviews_count,questions_count,in_stock,fulfillment_type,images_count,description_length,prime_eligible,buybox_winner',
            row: () => {
                const mrp = randFloat(100, 100000);
                const sell = +(mrp * randFloat(0.5, 0.99)).toFixed(2);
                return [
                    id('LST'), date(730), id('PRD'), id('SEL'),
                    pick(['Electronics','Fashion','Books','Grocery','Home']),
                    pick(['Mobiles','Clothes','Novels','Snacks','Furniture']),
                    pick(['Premium Wireless Earbuds','Slim Fit Jeans','Bestseller Novel','Organic Oats','Sofa Set']),
                    pick(['Sony','Levis','Penguin','Organic India','Nilkamal']),
                    mrp, sell, +((mrp - sell) / mrp * 100).toFixed(1),
                    randFloat(1, 5, 1), randInt(0, 50000), randInt(0, 500),
                    pick(['true','true','false']),
                    pick(['FBA','FBM','Easy Ship']),
                    randInt(1, 10), randInt(100, 5000),
                    pick(['true','false']), pick(['true','false'])
                ].join(',');
            }
        },
        {
            name: 'seller_performance',
            header: 'perf_id,date,seller_id,seller_name,category,orders_received,orders_shipped,cancellation_rate,return_rate,defect_rate,late_dispatch_rate,avg_rating,reviews_received,gmv,commission_earned,penalty_amount,account_health,prime_status,violations_count,tier',
            row: () => {
                const orders = randInt(1, 1000);
                const gmv = randFloat(1000, 10000000);
                return [
                    id('PRF'), date(), id('SEL'),
                    pick(['TechSell','FashionHub','BookWorld','GroceryKing']),
                    pick(['Electronics','Fashion','Books','Grocery']),
                    orders, randInt(orders * 0.85 | 0, orders),
                    randFloat(0, 0.2, 3), randFloat(0, 0.15, 3),
                    randFloat(0, 0.05, 3), randFloat(0, 0.1, 3),
                    randFloat(1, 5, 1), randInt(0, 100),
                    gmv, +(gmv * 0.025).toFixed(2), randFloat(0, 5000),
                    pick(['Good','Fair','At Risk','Deactivated']),
                    pick(['true','false']), randInt(0, 10),
                    pick(['Platinum','Gold','Silver','Bronze'])
                ].join(',');
            }
        },
        {
            name: 'customer_behaviour',
            header: 'session_id,session_date,customer_id,city,device,os,browser,pages_viewed,search_queries,products_viewed,add_to_cart,wishlist_adds,checkout_started,orders_placed,session_duration_mins,bounce_flag,traffic_source,campaign_id,ab_variant,clv_segment',
            row: () => [
                id('SES'), date(), id('CUS'),
                pick(['Mumbai','Delhi','Bangalore','Chennai','Hyderabad']),
                pick(['Mobile','Desktop','Tablet']),
                pick(['Android','iOS','Windows','macOS']),
                pick(['Chrome','Safari','Firefox']),
                randInt(1, 50), randInt(0, 20), randInt(0, 40),
                randInt(0, 10), randInt(0, 15), randInt(0, 5), randInt(0, 3),
                randFloat(0.5, 120, 1), pick(['true','false','false']),
                pick(['Organic','Paid Search','Social','Email','Direct','App']),
                pick(['','CAM001','CAM002','CAM003']),
                pick(['A','B','']),
                pick(['High','Medium','Low','At Risk'])
            ].join(',')
        },
        {
            name: 'logistics',
            header: 'shipment_id,created_date,order_id,seller_id,warehouse_id,delivery_partner,weight_kg,dimensions,service_type,pickup_date,dispatch_date,out_for_delivery_date,delivered_date,delivery_attempts,pod_collected,rto_flag,return_reason,freight_cost,cod_amount,ndr_count',
            row: () => {
                const created = new Date(Date.now() - randInt(1, 365) * 86400000);
                const dispatch = new Date(created.getTime() + randInt(1, 3) * 86400000);
                const delivered = new Date(dispatch.getTime() + randInt(1, 10) * 86400000);
                return [
                    id('SHP'), created.toISOString().split('T')[0], id('ORD'),
                    id('SEL'), id('WH'),
                    pick(['Delhivery','Ekart','BlueDart','XpressBees','Ecom Express']),
                    randFloat(0.1, 30, 2),
                    `${randInt(10,50)}x${randInt(10,50)}x${randInt(5,30)}`,
                    pick(['Standard','Express','Same Day','Next Day']),
                    dispatch.toISOString().split('T')[0],
                    dispatch.toISOString().split('T')[0],
                    new Date(dispatch.getTime() + randInt(1,8)*86400000).toISOString().split('T')[0],
                    delivered.toISOString().split('T')[0],
                    randInt(1, 4), pick(['true','false']),
                    pick(['false','false','false','true']),
                    pick(['','','Customer Refused','Wrong Address','Not Available']),
                    randFloat(20, 500), randFloat(0, 10000), randInt(0, 3)
                ].join(',');
            }
        }
    ],

    edtech: [
        {
            name: 'enrollments',
            header: 'enrollment_id,enrollment_date,student_id,course_id,course_name,category,instructor_id,fee_paid,discount_applied,payment_mode,platform,device,city,state,age_group,gender,education_level,completion_status,certificate_issued,nps_score',
            row: () => [
                id('ENR'), date(), id('STD'), id('CRS'),
                pick(['Data Science Bootcamp','Full Stack Dev','Digital Marketing','MBA Prep','CAT 2025']),
                pick(['Technology','Management','Creative','Exam Prep','Language']),
                id('INS'),
                randFloat(999, 99999), randFloat(0, 0.6, 2),
                pick(['Card','UPI','EMI','Scholarship','Employer']),
                pick(['Web','App','Mobile','LMS']),
                pick(['Android','iOS','Windows','macOS']),
                pick(['Mumbai','Delhi','Bangalore','Hyderabad','Kolkata']),
                pick(['MH','DL','KA','AP','WB','UP','RJ']),
                pick(['13-17','18-24','25-34','35-44','45+']),
                pick(['M','F','Other']),
                pick(['School','Graduate','Postgraduate','Working Professional']),
                pick(['Completed','In Progress','Dropped','Not Started']),
                pick(['true','false','false']),
                pick(['','1','2','3','4','5'])
            ].join(',')
        },
        {
            name: 'learning_activity',
            header: 'activity_id,date,student_id,course_id,module_id,content_type,duration_mins,completion_pct,quiz_attempted,quiz_score,assignment_submitted,notes_taken,bookmarks,replay_count,device,time_of_day,streak_days,doubt_posted,peer_interaction,ai_assist_used',
            row: () => [
                id('ACT'), date(), id('STD'), id('CRS'), id('MOD'),
                pick(['Video','PDF','Quiz','Live Class','Assignment','Project']),
                randFloat(1, 120, 1), randFloat(0, 100, 1),
                pick(['true','false']), randFloat(0, 100, 1),
                pick(['true','false']), pick(['true','false']),
                randInt(0, 10), randInt(0, 5),
                pick(['Mobile','Desktop','Tablet']),
                pick(['Morning','Afternoon','Evening','Night']),
                randInt(0, 365), pick(['true','false']),
                randInt(0, 20), pick(['true','false'])
            ].join(',')
        },
        {
            name: 'assessments',
            header: 'attempt_id,attempt_date,student_id,course_id,assessment_id,assessment_type,total_marks,obtained_marks,percentile,time_taken_mins,pass_flag,attempt_number,subject,topic,difficulty,questions_attempted,correct_answers,skipped,hints_used,review_mode',
            row: () => {
                const total = randInt(20, 100);
                const obtained = randInt(0, total);
                return [
                    id('ATT'), date(), id('STD'), id('CRS'), id('ASS'),
                    pick(['MCQ','Descriptive','Coding','Case Study','Live Test']),
                    total, obtained, randFloat(0, 100, 1),
                    randFloat(5, 180, 1), obtained >= total * 0.4 ? 'true' : 'false',
                    randInt(1, 5),
                    pick(['Math','Quant','English','Reasoning','DS','Algo','Marketing']),
                    pick(['Algebra','Statistics','Grammar','Puzzles','Arrays','Trees']),
                    pick(['Easy','Medium','Hard']),
                    randInt(10, total), randInt(0, obtained),
                    randInt(0, total - obtained), randInt(0, 10),
                    pick(['true','false'])
                ].join(',');
            }
        },
        {
            name: 'instructor_performance',
            header: 'record_id,date,instructor_id,instructor_name,course_id,active_learners,new_enrollments,completions,avg_rating,reviews_count,live_sessions,live_attendance_pct,content_hours_uploaded,revenue_earned,refund_rate,response_time_hrs,doubt_resolution_pct,course_rank,badge_level,payout_amount',
            row: () => [
                id('REC'), date(), id('INS'),
                pick(['Dr. Rahul Mehta','Prof. Anita Singh','Vikram Nair','Priya Sharma']),
                id('CRS'), randInt(10, 10000), randInt(0, 500), randInt(0, 200),
                randFloat(1, 5, 1), randInt(0, 1000),
                randInt(0, 20), randFloat(0, 100, 1), randFloat(0, 50, 1),
                randFloat(0, 500000), randFloat(0, 0.15, 3),
                randFloat(0.5, 48, 1), randFloat(50, 100, 1),
                randInt(1, 1000), pick(['Gold','Silver','Bronze','Platinum']),
                randFloat(0, 200000)
            ].join(',')
        },
        {
            name: 'job_placements',
            header: 'placement_id,date,student_id,course_id,job_title,company,industry,city,package_lpa,experience_years,interview_rounds,offers_count,job_type,placement_mode,days_to_placement,profile_score,skills_matched,resume_score,mock_interviews_done,placed_flag',
            row: () => [
                id('PLC'), date(), id('STD'), id('CRS'),
                pick(['SDE','Data Analyst','Product Manager','Digital Marketer','Business Analyst']),
                pick(['Google','Flipkart','Zomato','HDFC','Byju\'s','Infosys','TCS']),
                pick(['Tech','FinTech','EdTech','Consulting','Retail']),
                pick(['Bangalore','Mumbai','Delhi','Hyderabad','Pune']),
                randFloat(3, 50, 1), randInt(0, 10),
                randInt(1, 8), randInt(0, 5),
                pick(['Full-time','Part-time','Contract','Internship']),
                pick(['Campus','Off-Campus','Referral','Portal']),
                randInt(7, 365), randInt(30, 100), randInt(1, 15),
                randInt(30, 100), randInt(0, 10),
                pick(['true','true','false'])
            ].join(',')
        }
    ],

    services: [
        {
            name: 'service_requests',
            header: 'request_id,request_date,client_id,client_name,industry,service_type,sub_service,project_id,assigned_to,priority,status,estimated_hours,actual_hours,billable_hours,hourly_rate,billed_amount,sla_target_hours,sla_met,escalated,csat_score',
            row: () => {
                const est = randFloat(1, 200, 1);
                const actual = randFloat(est * 0.7, est * 1.5, 1);
                const bill = +(actual * 0.9).toFixed(1);
                const rate = randFloat(500, 10000);
                return [
                    id('REQ'), date(), id('CLI'),
                    pick(['Acme Corp','TechFlow','CloudBase','DataSync','InnovateCo']),
                    pick(['Finance','Healthcare','Retail','Manufacturing','SaaS']),
                    pick(['Consulting','Implementation','Support','Training','Audit']),
                    pick(['Strategy','Setup','Bug Fix','Workshop','Compliance Review']),
                    id('PRJ'), id('EMP'), pick(['Low','Medium','High','Critical']),
                    pick(['Open','In Progress','Resolved','Closed','Escalated']),
                    est, actual, bill, rate, +(bill * rate).toFixed(2),
                    randFloat(4, 72, 1),
                    actual <= est * 1.1 ? 'true' : 'false',
                    pick(['false','false','true']),
                    pick(['','1','2','3','4','5'])
                ].join(',');
            }
        },
        {
            name: 'projects',
            header: 'project_id,start_date,end_date,client_id,project_name,type,manager_id,team_size,budget,spent,revenue,margin_pct,milestone_count,milestones_met,risks_count,issues_count,change_requests,status,client_satisfaction,nps',
            row: () => {
                const budget = randFloat(100000, 50000000);
                const spent = +(budget * randFloat(0.5, 1.2)).toFixed(0);
                const rev = +(budget * randFloat(1.1, 1.5)).toFixed(0);
                return [
                    id('PRJ'), date(730), date(-90), id('CLI'),
                    pick(['Digital Transformation','ERP Implementation','Cloud Migration','BI Analytics','CRM Setup']),
                    pick(['Fixed Price','T&M','Retainer','Milestone']),
                    id('MGR'), randInt(2, 50),
                    budget, spent, rev, +((rev - spent) / rev * 100).toFixed(1),
                    randInt(3, 20), randInt(0, 20), randInt(0, 15),
                    randInt(0, 30), randInt(0, 10),
                    pick(['Planning','Active','On Hold','Completed','Cancelled']),
                    randFloat(1, 5, 1), randInt(-50, 100)
                ].join(',');
            }
        },
        {
            name: 'employee_utilisation',
            header: 'record_id,date,employee_id,department,grade,skill_primary,skill_secondary,billable_hours,non_billable_hours,bench_hours,training_hours,leave_hours,utilisation_pct,projects_count,client_id,billing_rate,revenue_generated,performance_rating,certification,travel_days',
            row: () => {
                const billable = randFloat(0, 200, 1);
                const non_bill = randFloat(0, 40, 1);
                const bench = randFloat(0, 40, 1);
                const total = billable + non_bill + bench;
                return [
                    id('REC'), date(), id('EMP'),
                    pick(['Consulting','Technology','Finance','Operations','HR']),
                    pick(['Analyst','Senior Analyst','Manager','Senior Manager','Director']),
                    pick(['Java','Python','SQL','SAP','Salesforce','Power BI','AWS']),
                    pick(['Agile','PowerPoint','Excel','Cloud','ML']),
                    billable, non_bill, bench, randFloat(0, 20, 1),
                    randFloat(0, 40, 1), +(billable / (total || 1) * 100).toFixed(1),
                    randInt(1, 5), id('CLI'), randFloat(1000, 20000),
                    +(billable * randFloat(1000, 20000)).toFixed(2),
                    randFloat(1, 5, 1),
                    pick(['None','AWS-SAA','CFA','PMP','CISA','GCP']),
                    randInt(0, 15)
                ].join(',');
            }
        },
        {
            name: 'invoices',
            header: 'invoice_id,invoice_date,due_date,client_id,project_id,invoice_type,line_items,amount,tax_amount,total_amount,currency,payment_terms_days,paid_date,paid_amount,outstanding,dso_days,dispute_flag,dispute_reason,writeoff_amount,collection_status',
            row: () => {
                const amount = randFloat(10000, 10000000);
                const tax = +(amount * 0.18).toFixed(2);
                const total = +(amount + tax).toFixed(2);
                const paid = +(total * randFloat(0, 1)).toFixed(2);
                return [
                    id('INV'), date(), date(-30), id('CLI'), id('PRJ'),
                    pick(['Milestone','Monthly Retainer','Ad Hoc','Expense Reimbursement']),
                    randInt(1, 20), amount, tax, total,
                    pick(['INR','USD','EUR']),
                    pick([30, 45, 60, 90]),
                    paid > 0 ? date(30) : '',
                    paid, +(total - paid).toFixed(2),
                    randInt(0, 180),
                    pick(['false','false','true']),
                    pick(['','Overbilling','Service quality','Delay']),
                    +(total * randFloat(0, 0.05)).toFixed(2),
                    pick(['Collected','Partial','Overdue','In Dispute','Written Off'])
                ].join(',');
            }
        },
        {
            name: 'client_health',
            header: 'health_id,date,client_id,client_name,account_manager,relationship_years,active_projects,revenue_ytd,revenue_ly,growth_pct,nps_score,csat_score,open_tickets,escalations_ytd,executive_contacts,last_qbr_date,renewal_probability,expansion_potential,at_risk_flag,health_score',
            row: () => {
                const rev_ly = randFloat(100000, 50000000);
                const rev_ytd = +(rev_ly * randFloat(0.5, 1.5)).toFixed(0);
                return [
                    id('HLT'), date(), id('CLI'),
                    pick(['Acme Corp','TechFlow','CloudBase','GlobalBank','RetailGiant']),
                    id('AM'), randInt(1, 20), randInt(1, 15),
                    rev_ytd, rev_ly, +((rev_ytd - rev_ly) / rev_ly * 100).toFixed(1),
                    randInt(-50, 100), randFloat(1, 5, 1),
                    randInt(0, 30), randInt(0, 10),
                    randInt(1, 10), date(180),
                    randFloat(0, 1, 2), pick(['High','Medium','Low']),
                    pick(['false','false','true']),
                    randInt(0, 100)
                ].join(',');
            }
        }
    ],
};

// ── Writer ────────────────────────────────────────────────────────────────────

async function writeDataset(domain, schema) {
    const domainDir = path.join(OUT_DIR, domain);
    await mkdir(domainDir, { recursive: true });
    const filePath = path.join(domainDir, `${schema.name}.csv`);

    return new Promise((resolve, reject) => {
        const ws = createWriteStream(filePath, { encoding: 'utf8' });
        ws.on('error', reject);

        ws.write(schema.header + '\n');

        let written = 0;
        function writeBatch() {
            let ok = true;
            while (written < ROWS && ok) {
                const batchEnd = Math.min(written + BATCH, ROWS);
                const lines = [];
                for (let i = written; i < batchEnd; i++) {
                    lines.push(schema.row());
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

        ws.on('finish', () => {
            const stats = { path: filePath, rows: ROWS };
            resolve(stats);
        });

        writeBatch();
    });
}

// ── Main ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const generateAll = args.includes('--all');
const targetDomain = args.find(a => !a.startsWith('--'));
const domainsToRun = generateAll ? Object.keys(SCHEMAS) : (targetDomain ? [targetDomain] : ['retail']);

console.log(`\n🗄  VistaraBI Dataset Generator`);
console.log(`   Domains: ${domainsToRun.join(', ')}`);
console.log(`   Files per domain: 5 | Rows per file: ${ROWS.toLocaleString()} | Columns: 20`);
console.log(`   Output: ${OUT_DIR}\n`);

let totalFiles = 0;
const start = Date.now();

for (const domain of domainsToRun) {
    if (!SCHEMAS[domain]) {
        console.error(`  ❌ Unknown domain: ${domain}. Available: ${Object.keys(SCHEMAS).join(', ')}`);
        continue;
    }
    const schemas = SCHEMAS[domain];
    console.log(`\n📂 ${domain.toUpperCase()}`);
    for (const schema of schemas) {
        const t = Date.now();
        process.stdout.write(`   ⏳ ${schema.name} (${ROWS.toLocaleString()} rows)...`);
        await writeDataset(domain, schema);
        totalFiles++;
        const elapsed = ((Date.now() - t) / 1000).toFixed(1);
        console.log(` ✅ ${elapsed}s → ${path.join('test-datasets', domain, schema.name + '.csv')}`);
    }
}

const totalSecs = ((Date.now() - start) / 1000).toFixed(1);
console.log(`\n✅ Done. ${totalFiles} files generated in ${totalSecs}s`);
console.log(`   Total rows: ${(totalFiles * ROWS).toLocaleString()}`);
console.log(`   Location: ${OUT_DIR}\n`);
