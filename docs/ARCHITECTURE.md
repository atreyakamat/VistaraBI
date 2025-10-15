# VistaraBI Architecture Overview

## 🏗️ System Architecture

VistaraBI follows a modern three-tier architecture with AI/ML capabilities:

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│              React + TypeScript + Vite + Tailwind           │
│                      (Port 3000)                             │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/REST
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                       Backend Layer                          │
│              Node.js + Express + Prisma ORM                 │
│                      (Port 5000)                             │
└───────────┬─────────────────────────────────┬───────────────┘
            │                                 │
            │ PostgreSQL                      │ HTTP/REST
            ▼                                 ▼
┌─────────────────────┐         ┌──────────────────────────────┐
│   Database Layer    │         │       AI Service Layer       │
│   PostgreSQL 15+    │         │   Python + FastAPI + ML      │
│    (Port 5432)      │         │        (Port 8000)           │
└─────────────────────┘         └──────────────────────────────┘
```

---

## 📦 Component Breakdown

### Frontend (React + TypeScript)

**Technology Stack:**
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Zustand for state management
- React Router for navigation
- Chart.js & Plotly for visualizations
- React Query for data fetching

**Key Modules:**
1. **File Upload** - Drag-and-drop interface for data uploads
2. **Dashboard** - Dynamic KPI visualization and charts
3. **Chat Interface** - Natural language query system
4. **Goals Management** - Business goal setting and tracking
5. **Report Export** - PDF report generation and sharing

**State Management:**
- `fileStore.ts` - File upload and processing state
- `dashboardStore.ts` - Dashboard configuration and filters
- `chatStore.ts` - Conversation history and context
- `userStore.ts` - User preferences and settings

---

### Backend (Node.js + Express)

**Technology Stack:**
- Node.js 18+ with ES Modules
- Express.js for REST API
- Prisma ORM for database access
- JWT for authentication
- Multer for file uploads
- Puppeteer for PDF generation

**Key Services:**

1. **File Processing Service**
   - CSV/Excel/PDF parsing
   - Data validation and cleaning
   - Type detection
   - Missing value handling

2. **KPI Calculation Engine**
   - Formula execution
   - Aggregation pipelines
   - Caching layer

3. **PDF Generation Service**
   - Template rendering
   - Chart embedding
   - Branding customization

**Middleware:**
- Authentication (JWT validation)
- File validation (type, size)
- Error handling
- Rate limiting
- Request logging (Morgan)

---

### AI Service (Python + FastAPI)

**Technology Stack:**
- FastAPI for API endpoints
- Pandas/NumPy for data processing
- Scikit-learn for ML models
- Transformers for NLP
- Prophet for forecasting
- spaCy for text processing
- Ollama/OpenRouter for LLM integration

**AI Modules:**

1. **Domain Classifier**
   - Synthetic data generation
   - Multi-class classification
   - Confidence scoring

2. **KPI Extraction**
   - Semantic column matching
   - Relevance scoring
   - Priority ranking
   - Domain-specific KPI library

3. **Chat Engine**
   - NLP query parsing
   - Text-to-SQL conversion
   - Context management
   - Response generation

4. **Goal Mapping**
   - Goal text parsing
   - KPI-goal association
   - Dependency graph analysis
   - Action plan generation

5. **Forecasting Engine**
   - Time series analysis
   - Prophet/ARIMA models
   - Scenario generation
   - Confidence intervals

---

### Database (PostgreSQL)

**Schema Design:**

```
Users
├── Files (1:N)
│   └── KPIs (1:N)
├── Goals (1:N)
│   └── Actions (1:N)
└── Chats (1:N)
```

**Key Tables:**
- `users` - User accounts and authentication
- `files` - Uploaded files and metadata
- `kpis` - Calculated KPI values
- `goals` - Business goals and targets
- `actions` - Goal action plans
- `chats` - Conversation history

---

## 🔄 Data Flow

### 1. File Upload Flow

```
User → Frontend → Backend → Database
                      ↓
                  AI Service (Domain Detection)
                      ↓
                  Backend (Store Results)
                      ↓
                  Frontend (Display Domain)
```

### 2. KPI Extraction Flow

```
File Data → AI Service (Column Analysis)
               ↓
          KPI Library Matching
               ↓
          Relevance Scoring
               ↓
          Backend (Calculate Values)
               ↓
          Database (Store KPIs)
               ↓
          Frontend (Visualize)
```

### 3. Chat Query Flow

```
User Query → Frontend → Backend → AI Service
                                      ↓
                                  NLP Processing
                                      ↓
                                  SQL Generation
                                      ↓
                          Backend (Execute Query)
                                      ↓
                          AI Service (Format Response)
                                      ↓
                          Frontend (Display Answer)
```

---

## 🔐 Security Architecture

**Authentication:**
- JWT tokens for API authentication
- Secure password hashing (bcrypt)
- Session management

**Data Security:**
- Input validation (Joi)
- SQL injection prevention (Prisma parameterized queries)
- File type validation
- XSS protection
- CORS configuration

**Privacy:**
- User data isolation
- Secure file storage
- Audit logging

---

## 📈 Scalability Considerations

**Current Architecture (MVP):**
- Single server deployment
- In-memory caching
- Local file storage

**Future Enhancements:**
- Load balancing (multiple backend instances)
- Redis for distributed caching
- S3 for file storage
- Message queue (RabbitMQ/Kafka) for async processing
- Kubernetes for orchestration
- CDN for static assets

---

## 🧪 Testing Strategy

**Frontend:**
- Unit tests (Vitest)
- Component tests (React Testing Library)
- E2E tests (Playwright)

**Backend:**
- Unit tests (Jest)
- Integration tests
- API tests (Supertest)

**AI Service:**
- Unit tests (pytest)
- Model validation
- Performance benchmarks

---

## 📊 Monitoring & Logging

**Logging:**
- Morgan (HTTP request logging)
- Winston (application logging)
- Python logging module

**Monitoring:**
- Health check endpoints
- Performance metrics
- Error tracking

**Observability:**
- API response times
- Database query performance
- ML model accuracy metrics

---

## 🚀 Deployment Architecture

**Development:**
- Local development (npm/pip)
- Docker Compose for full stack

**Production (Future):**
- Frontend: Vercel/Netlify
- Backend: AWS EC2/Heroku
- AI Service: AWS EC2 with GPU
- Database: AWS RDS PostgreSQL
- CDN: Cloudflare

---

## 🔧 Technology Decisions

### Why React + TypeScript?
- Type safety for large codebase
- Rich ecosystem
- Team familiarity
- Excellent developer experience

### Why Node.js + Express?
- JavaScript across stack
- Fast development
- Large package ecosystem
- Good for I/O operations

### Why Python + FastAPI for AI?
- Best ML/AI library support
- FastAPI performance
- Automatic API documentation
- Type hints with Pydantic

### Why PostgreSQL?
- ACID compliance
- JSON support for flexible data
- Strong community
- Free and open-source

---

## 📝 Design Patterns Used

**Frontend:**
- Component composition
- Custom hooks for reusability
- Store pattern (Zustand)
- Service layer for API calls

**Backend:**
- Middleware pattern
- Repository pattern (Prisma)
- Service layer separation
- Error handling middleware

**AI Service:**
- Strategy pattern (different ML models)
- Factory pattern (model selection)
- Pipeline pattern (data processing)

---

## 🎯 Performance Optimization

**Frontend:**
- Code splitting (Vite)
- Lazy loading components
- Memoization (React.memo, useMemo)
- Debouncing user input

**Backend:**
- Database query optimization
- Connection pooling (Prisma)
- Caching frequent queries
- Pagination for large datasets

**AI Service:**
- Model caching
- Batch predictions
- Async processing
- Result caching

---

## 🔄 Development Workflow

```
Feature Branch → Local Development → Testing → Pull Request
                                                     ↓
                                              Code Review
                                                     ↓
                                            Merge to Develop
                                                     ↓
                                            Integration Tests
                                                     ↓
                                             Merge to Main
                                                     ↓
                                            Deploy to Production
```

---

## 📚 Further Reading

- [Setup Guide](./SETUP.md)
- [API Documentation](./API.md)
- [Contributing Guidelines](../CONTRIBUTING.md)

---

For questions or clarifications, contact the development team.
