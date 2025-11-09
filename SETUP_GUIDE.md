# Quick Setup Guide - Data Upload Module

## Prerequisites
1. Node.js 18+ installed
2. PostgreSQL 15+ installed and running
3. Redis installed and running  
4. Git

## Step-by-Step Setup

### 1. Database Setup

```powershell
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE vistarabi;
CREATE USER vistarabi WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE vistarabi TO vistarabi;

# Connect to the new database
\c vistarabi

# Grant schema privileges
GRANT ALL ON SCHEMA public TO vistarabi;
```

### 2. Start Redis

```powershell
# If Redis is installed as a service
redis-server

# Or if using Windows Redis port
redis-server.exe

# Test Redis connection
redis-cli ping
# Should return: PONG
```

### 3. Backend Setup

```powershell
cd backend

# Install dependencies
npm install

# Create .env file (already created)
# Verify DATABASE_URL and REDIS_URL are correct

# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Start backend server (Terminal 1)
npm run dev
```

### 4. Start Worker (New Terminal)

```powershell
cd backend

# Start the background worker (Terminal 2)
npm run worker
```

### 5. Frontend Setup (New Terminal)

```powershell
cd frontend

# Install dependencies
npm install

# Start development server (Terminal 3)
npm run dev
```

### 6. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

## Testing the Upload

1. Navigate to http://localhost:3000
2. Drag and drop the test file: `test_data/sample.csv`
3. Click "Upload Files"
4. Watch the progress bar
5. Check the status updates in real-time

## Verification Checklist

- [ ] PostgreSQL is running
- [ ] Redis is running
- [ ] Backend server is running on port 5000
- [ ] Worker is running and listening for jobs
- [ ] Frontend is running on port 3000
- [ ] Can access frontend in browser
- [ ] Backend status shows "online"

## Troubleshooting

### PostgreSQL Issues

```powershell
# Check if PostgreSQL is running
Get-Service -Name postgresql*

# Start PostgreSQL service
Start-Service postgresql-x64-15

# Test connection
psql -U vistarabi -d vistarabi
```

### Redis Issues

```powershell
# Check if Redis is running
redis-cli ping

# If not installed, use Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### Port Already in Use

```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

### Database Migration Errors

```powershell
cd backend

# Reset database
npx prisma migrate reset

# Run migrations again
npx prisma migrate dev
```

## Common Issues

### "Cannot connect to database"
- Verify PostgreSQL is running
- Check DATABASE_URL in backend/.env
- Ensure database 'vistarabi' exists

### "Worker not processing files"
- Verify Redis is running
- Check REDIS_URL in backend/.env
- Restart worker: `npm run worker`

### "File upload fails"
- Check backend/uploads directory exists
- Verify file size < 1 GB
- Check backend logs for errors

## Development Tips

### View Logs

```powershell
# Backend logs
# Check Terminal 1 where npm run dev is running

# Worker logs
# Check Terminal 2 where npm run worker is running

# Database logs
# Check PostgreSQL logs
```

### Database Management

```powershell
# Open Prisma Studio (GUI for database)
cd backend
npx prisma studio
# Opens at http://localhost:5555
```

### Clear Upload Data

```powershell
# Connect to database
psql -U vistarabi -d vistarabi

# View uploads
SELECT * FROM uploads;

# Delete all uploads
DELETE FROM uploads;

# Drop dynamic tables
DROP TABLE IF EXISTS upload_<uuid>;
```

## Next Steps

After successful setup:
1. Try uploading different file types (CSV, JSON, XLSX)
2. Test large files
3. Test multiple concurrent uploads
4. Check database tables created
5. Explore Prisma Studio to view data

## Docker Alternative (If Docker Desktop is installed)

```powershell
# Start all services
docker-compose up -d

# Run migrations
docker exec -it vistarabi-backend npx prisma migrate dev

# Start worker
docker exec -it vistarabi-backend npm run worker
```

---

Need help? Check MODULE_1_README.md for detailed documentation.
