# VistaraBI - Intelligent Business Analytics Platform

## 🎯 Current Status: Module 1 - Data Upload (Completed)

VistaraBI is an AI-powered business intelligence platform. **Module 1** provides a comprehensive data upload system with automatic schema inference and background processing.

## ✨ Module 1 Features

- ✅ Upload multiple file types (CSV, XLSX, JSON, XML, PDF, DOCX, PPTX, TXT)
- ✅ Drag and drop interface with progress tracking
- ✅ Support for large files (up to 1 GB)
- ✅ Asynchronous background processing with BullMQ
- ✅ Automatic schema inference and table creation
- ✅ Real-time status updates
- ✅ Parallel uploads (3 files concurrently)
- ✅ Batch processing (1000 records at a time)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/atreyakamat/VistaraBI.git
cd VistaraBI

# Setup backend
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev

# Setup frontend
cd ../frontend
npm install
cp .env.example .env

# Go back to root
cd ..
```

### Running the Application

**Option 1: With Docker (Recommended)**
```bash
docker-compose up -d postgres redis
cd backend && npm run dev   # Terminal 1
cd backend && npm run worker # Terminal 2
cd frontend && npm run dev   # Terminal 3
```

**Option 2: Without Docker**
See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed setup instructions.

### Access
- 🌐 **Frontend**: http://localhost:3000
- 🔧 **Backend API**: http://localhost:5000
- 📊 **Prisma Studio**: `npx prisma studio` (in backend folder)

## 📁 Project Structure

```
vistarabi/
├── frontend/              # React + TypeScript + Vite (Port 3000)
│   ├── src/
│   │   ├── components/   # DragDropZone, FileListItem, ProgressBar
│   │   ├── hooks/        # useUpload
│   │   ├── pages/        # UploadPage
│   │   └── services/     # uploadApi
│   └── package.json
├── backend/              # Node.js + Express + Prisma (Port 5000)
│   ├── src/
│   │   ├── controllers/  # upload.controller.js
│   │   ├── routes/       # upload.js
│   │   ├── services/     # File processors and parsers
│   │   │   ├── parsers/  # CSV, Excel, JSON, XML parsers
│   │   │   ├── fileProcessor.js
│   │   │   └── dbOperations.js
│   │   ├── jobs/         # BullMQ queue and worker
│   │   └── server.js
│   ├── prisma/
│   │   └── schema.prisma # Upload model
│   └── package.json
├── test_data/            # Sample CSV and JSON files
├── docs/                 # Documentation
├── MODULE_1_README.md    # Detailed module documentation
├── SETUP_GUIDE.md       # Step-by-step setup guide
└── docker-compose.yml    # Docker services configuration
```

## � Documentation

- **[MODULE_1_README.md](MODULE_1_README.md)** - Complete module documentation with API reference
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Detailed setup and troubleshooting guide
- **[docs/API.md](docs/API.md)** - API endpoint documentation
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture overview

## 🔧 Tech Stack

### Frontend
- React 18 with TypeScript
- Vite (build tool)
- Tailwind CSS
- React Dropzone
- Axios

### Backend
- Node.js & Express.js
- PostgreSQL with Prisma ORM
- Redis & BullMQ (job queue)
- Multer (file uploads)
- CSV-Parse, XLSX, XML2JS (parsers)

## 🧪 Testing
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
npx prisma migrate dev --name init
npx prisma generate

# Start server
npm run dev
```
Visit: http://localhost:5000/api/health

### 3. AI Services Setup (Atreya)
```bash
cd ai
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start service
python app.py
```
Visit: http://localhost:8000

## 🧪 Testing the Skeleton

### Test 1: Health Checks
```bash
# Test Backend
curl http://localhost:5000/api/health

# Test AI Service
curl http://localhost:8000

# Test Frontend
# Open browser to http://localhost:3000
```

### Test 2: Full Stack Communication
```bash
# Start all services in separate terminals
cd frontend && npm run dev
cd backend && npm run dev
cd ai && python app.py

# Frontend should display "All Systems Operational" if all services are running
```

## 👥 Team Responsibilities

- **Harsh**: Frontend (React + TypeScript)
- **Parth**: Backend (Node.js + Express + Prisma)
- **Atreya**: AI Services (Python + FastAPI)

## 🔄 Development Workflow

```bash
# Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# Work on your feature
# ... code ...

# Commit and push
git add .
git commit -m "[Module] Brief description"
git push origin feature/your-feature-name

# Create Pull Request on GitHub
# After review, merge to develop
```

## 📚 Documentation

- [Setup Guide](./docs/SETUP.md)
- [API Documentation](./docs/API.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)

## 🐛 Troubleshooting

### Frontend won't start
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Backend database errors
```bash
cd backend
npx prisma migrate reset
npx prisma migrate dev
```

### AI service import errors
```bash
cd ai
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

## 📝 License

MIT License - see LICENSE file for details
