# VistaraBI — Next Frontiers & Engineering Implementation Guide
## Concrete Code Architectures for the Next Development Phases

This guide details exactly how to implement the advanced improvements outlined in `improvement.md` and `future-ideation.md`, providing concrete code examples and file structures.

---

## 1. Zero-Latency In-Browser OLAP (DuckDB WASM & Apache Arrow)

### The Architecture
Instead of making server-side SQL queries whenever a user toggles date ranges or filter chips, we load the parsed dataset into a client-side **DuckDB WebAssembly** database. 

```
[Raw CSV Upload] ──> [Server Clean & Convert] ──> [Parquet File Delivery]
                                                               │
                                                               v
[Dashboard UI Controls] <── (Fast Local SQL) ──> [Client-Side DuckDB WASM]
```

### Implementation Blueprint
1.  **Add Dependencies**:
    ```bash
    npm install @duckdb/duckdb-wasm apache-arrow
    ```
2.  **Initialize DuckDB WASM Client** (`src/lib/duckdb/client.ts`):
    ```typescript
    import * as duckdb from '@duckdb/duckdb-wasm';

    let db: duckdb.AsyncDuckDB | null = null;

    export async function getDuckDB() {
      if (db) return db;

      const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
      const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

      const worker_url = URL.createObjectURL(
        new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
      );

      const worker = new Worker(worker_url);
      const logger = new duckdb.ConsoleLogger();
      db = new duckdb.AsyncDuckDB(logger, worker);
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      return db;
    }
    ```
3.  **Execute Local OLAP Query** inside the dashboard:
    ```typescript
    import { getDuckDB } from '@/lib/duckdb/client';

    export async function queryLocalMetrics(parquetUrl: string, sqlQuery: string) {
      const db = await getDuckDB();
      const conn = await db.connect();
      
      // Register Parquet file from HTTP URL
      await db.registerFileURL('data.parquet', parquetUrl, duckdb.DuckDBDataProtocol.HTTP, false);
      
      const resultSet = await conn.query(sqlQuery);
      await conn.close();
      return resultSet.toArray().map(row => row.toJSON());
    }
    ```

---

## 2. Interactive Drag-and-Drop Dashboard Editor

### The Architecture
Allow business owners to drag, resize, and custom-position metric cards (e.g., placing the anomaly cards at the top-left or expanding the Revenue chart to full-width). We persist these coordinate matrices to the `DashboardCard` table in Prisma.

### Implementation Blueprint
1.  **Add React Grid Layout**:
    ```bash
    npm install react-grid-layout @types/react-grid-layout
    ```
2.  **Grid System Wrapper** (`src/components/dashboard/EditableGrid.tsx`):
    ```tsx
    import GridLayout from 'react-grid-layout';
    import 'react-grid-layout/css/styles.css';
    import 'react-resizable/css/styles.css';

    interface CardLayout {
      i: string; // card KPI ID
      x: number; y: number; w: number; h: number;
    }

    export function EditableGrid({ cards, layout, onLayoutChange, isEditMode }: any) {
      const handleLayoutChange = (newLayout: GridLayout.Layout[]) => {
        const mapped = newLayout.map(l => ({
          i: l.i, x: l.x, y: l.y, w: l.w, h: l.h
        }));
        onLayoutChange(mapped);
      };

      return (
        <GridLayout
          className="layout"
          layout={layout}
          cols={12}
          rowHeight={100}
          width={1200}
          isDraggable={isEditMode}
          isResizable={isEditMode}
          onLayoutChange={handleLayoutChange}
        >
          {cards.map((card: any) => (
            <div key={card.kpiId} className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="drag-handle cursor-move text-slate-400 absolute top-2 right-2">drag_indicator</span>
              {card.content}
            </div>
          ))}
        </GridLayout>
      );
    }
    ```

---

## 3. Active Alerting & Outbound Webhook Pipelines

### The Architecture
Instead of passive dashboards, VistaraBI automatically emails reports or sends Slack cards when a key KPI breaks statistical thresholds.

```
[Chron Ingestion Daemon] ──> [Anomaly Detected] ──> [Outbound Dispatcher]
                                                            │
                                        ┌───────────────────┴───────────────────┐
                                        v                                       v
                             [Slack Webhook Payload]                  [Resend Email Delivery]
```

### Implementation Blueprint
1.  **Configure Integrations Router** (`src/lib/alerts/dispatcher.ts`):
    ```typescript
    import { Resend } from 'resend';
    import axios from 'axios';

    const resend = new Resend(process.env.RESEND_API_KEY);

    export async function dispatchAlert(project: any, kpiName: string, anomalyDetails: any) {
      const message = `⚠️ Anomaly detected in project ${project.name}: KPI "${kpiName}" dropped by ${anomalyDetails.deltaPercent.toFixed(1)}% below the historical average.`;

      // 1. Dispatch to Slack Webhook
      if (project.slackWebhookUrl) {
        await axios.post(project.slackWebhookUrl, {
          text: message,
          blocks: [
            {
              type: "section",
              text: { type: "mrkdwn", text: `*Anomaly Detected!* \n${message}` }
            },
            {
              type: "actions",
              elements: [
                {
                  type: "button",
                  text: { type: "plain_text", text: "View Dashboard" },
                  url: `${process.env.NEXT_PUBLIC_APP_URL}/app/projects/${project.id}`
                }
              ]
            }
          ]
        }).catch(err => console.error("Slack alert dispatch failed", err));
      }

      // 2. Dispatch email via Resend
      if (project.notificationEmail) {
        await resend.emails.send({
          from: 'VistaraBI Alert <alerts@vistarabi.com>',
          to: project.notificationEmail,
          subject: `[ALERT] Anomaly in ${project.name} - ${kpiName}`,
          html: `<p>${message}</p><br/><a href="${process.env.NEXT_PUBLIC_APP_URL}/app/projects/${project.id}">Review Strategic Scenarios</a>`
        }).catch(err => console.error("Email dispatch failed", err));
      }
    }
    ```

---

## 4. Federated Data Virtualization (duckdb JOINs)

### The Architecture
Allows users to upload multiple files (e.g., `Shopify_Orders.csv` and `Stripe_Charges.csv`) and query them as a virtualized schema without building custom database schemas.

### Implementation Blueprint
1.  **Cross-File SQL Querying**:
    ```sql
    -- In DuckDB, files are queried directly as tables using read_csv_auto
    SELECT 
      o.order_id,
      o.revenue,
      c.fee,
      (o.revenue - c.fee) as net_payout
    FROM read_csv_auto('Shopify_Orders.csv') o
    JOIN read_csv_auto('Stripe_Charges.csv') c 
      ON o.order_id = c.metadata_order_id;
    ```
2.  **Dynamic Relationship Mapping**:
    We use the discovered relationships in the `RelationshipRegistry` to dynamically compile the virtual SQL `JOIN` parameters, letting users compare E-Commerce orders with advertising spend in a single query.
