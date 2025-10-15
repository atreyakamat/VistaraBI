# VistaraBI API Documentation

## 📡 API Overview

VistaraBI consists of three main API services:

1. **Backend API** (http://localhost:5000) - Express.js REST API
2. **AI Service** (http://localhost:8000) - FastAPI for ML/AI operations
3. **Frontend** (http://localhost:3000) - React application

---

## 🔐 Authentication

(Coming Soon - JWT-based authentication)

---

## 🗂️ Backend API Endpoints

### Health Check

**GET** `/api/health`

Check if backend service and database are operational.

**Response:**
```json
{
  "status": "ok",
  "message": "VistaraBI Backend is healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "services": {
    "backend": "operational",
    "database": "operational"
  }
}
```

### File Upload

**POST** `/api/upload`

Upload CSV, Excel, or PDF files for analysis.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (File object)

**Response:**
```json
{
  "message": "File uploaded successfully",
  "file": {
    "originalName": "sales_data.csv",
    "fileName": "file-1234567890-abc.csv",
    "size": 1024,
    "type": "text/csv",
    "path": "uploads/file-1234567890-abc.csv"
  }
}
```

### File Management

**GET** `/api/files`

Get all uploaded files for current user.

**GET** `/api/files/:id`

Get specific file details.

**DELETE** `/api/files/:id`

Delete a specific file.

### KPI Endpoints

**GET** `/api/kpis`

Get all KPIs.

**GET** `/api/kpis/:fileId`

Get KPIs for a specific file.

### Goals

**GET** `/api/goals`

Get all goals for current user.

**POST** `/api/goals`

Create a new business goal.

**GET** `/api/goals/:id`

Get specific goal details.

### Chat

**POST** `/api/chat`

Send a natural language query about your data.

**Request:**
```json
{
  "message": "What was our revenue last month?",
  "context": {
    "fileId": "abc-123"
  }
}
```

**GET** `/api/chat/history`

Get chat conversation history.

### Export

**POST** `/api/export/pdf`

Generate PDF report from current dashboard.

**GET** `/api/export/:id`

Download generated report.

---

## 🤖 AI Service Endpoints

### Domain Detection

**POST** `/api/ai/domain/detect`

Detect business domain from uploaded data.

**Request:**
```json
{
  "data": {...},
  "columns": ["date", "revenue", "product_id", "customer_id"]
}
```

**Response:**
```json
{
  "domain": "retail",
  "confidence": 0.85,
  "suggestions": [
    "Consider adding product_id column",
    "Revenue data looks good"
  ]
}
```

**GET** `/api/ai/domain/domains`

Get list of supported business domains.

### KPI Extraction

**POST** `/api/ai/kpis/extract`

Extract relevant KPIs based on domain and data structure.

**Request:**
```json
{
  "domain": "retail",
  "columns": ["date", "revenue", "units_sold"],
  "data_sample": {...}
}
```

**Response:**
```json
{
  "kpis": [
    {
      "name": "Revenue Growth Rate",
      "description": "Year-over-year revenue growth percentage",
      "formula": "((current_revenue - previous_revenue) / previous_revenue) * 100",
      "category": "Financial",
      "priority": 1
    }
  ],
  "recommendations": [
    "Add customer_id column to track customer metrics"
  ]
}
```

**GET** `/api/ai/kpis/library/:domain`

Get all available KPIs for a specific domain.

### Chat Engine

**POST** `/api/ai/chat`

Process natural language queries.

**Request:**
```json
{
  "message": "Show me top 5 products by revenue",
  "context": {
    "fileId": "abc-123",
    "domain": "retail"
  },
  "conversation_id": "conv-456"
}
```

**Response:**
```json
{
  "response": "Here are your top 5 products by revenue...",
  "suggestions": [
    "Compare to last quarter",
    "Show profit margins",
    "Analyze by region"
  ],
  "sql_query": "SELECT product_name, SUM(revenue) FROM...",
  "visualization_type": "bar_chart"
}
```

### Goal Mapping

**POST** `/api/ai/goals/map`

Map business goals to KPIs and generate action plans.

**Request:**
```json
{
  "goal_text": "Increase revenue by 20% in Q2",
  "target_value": 120000,
  "current_value": 100000,
  "deadline": "2024-06-30",
  "available_kpis": ["revenue", "customer_count", "avg_order_value"]
}
```

**Response:**
```json
{
  "mapped_kpis": ["Revenue Growth Rate", "Customer Acquisition Cost"],
  "actions": [
    {
      "title": "Optimize Marketing Campaigns",
      "description": "Focus on high-performing channels",
      "priority": "high",
      "impact": "high",
      "effort": "medium"
    }
  ],
  "dependencies": {
    "Revenue Growth Rate": ["Customer Acquisition Cost", "Average Order Value"]
  },
  "timeline": [...]
}
```

### Forecasting

**POST** `/api/ai/forecast/predict`

Generate time series forecasts.

**Request:**
```json
{
  "data": [...],
  "target_column": "revenue",
  "periods": 6,
  "confidence_interval": 0.95
}
```

**Response:**
```json
{
  "predictions": [
    {"date": "2024-01-01", "value": 10500.50}
  ],
  "confidence_intervals": [
    {"date": "2024-01-01", "lower": 9500.0, "upper": 11500.0}
  ],
  "model_used": "prophet",
  "accuracy_metrics": {
    "mae": 250.5,
    "rmse": 320.8,
    "mape": 2.5
  }
}
```

---

## 📊 Status Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 201  | Created |
| 400  | Bad Request |
| 401  | Unauthorized |
| 403  | Forbidden |
| 404  | Not Found |
| 500  | Internal Server Error |
| 503  | Service Unavailable |

---

## 🔧 Error Responses

All errors follow this format:

```json
{
  "error": {
    "message": "Descriptive error message",
    "status": 400,
    "details": {...}
  }
}
```

---

## 🧪 Testing APIs

### Using cURL

```bash
# Health check
curl http://localhost:5000/api/health

# Upload file
curl -X POST -F "file=@./data.csv" http://localhost:5000/api/upload

# Chat query
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Show revenue trends"}'
```

### Using Postman

Import the API collection (coming soon) or create requests manually.

### Using FastAPI Docs

Visit http://localhost:8000/docs for interactive AI service documentation.

---

## 🚀 Rate Limits

(Coming Soon)

---

## 📝 Notes

- All timestamps are in ISO 8601 format
- File size limit: 10MB (configurable)
- Supported file types: CSV, XLSX, XLS, PDF
- All responses are in JSON format

---

For implementation details, see the source code in respective route files.
