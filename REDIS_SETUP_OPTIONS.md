# 🚀 Quick Start Guide - No Docker Needed

Since Docker Desktop is not running, here are alternative ways to get the backend working:

## Option 1: Use Chocolatey to Install Redis ⭐ Easiest

### Install Chocolatey (if not installed)

Open **PowerShell as Administrator** and run:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### Install Redis

```powershell
# Still as Administrator
choco install redis-64 -y
```

### Start Redis

```powershell
# Start Redis service
redis-server --service-start

# Verify it's running
redis-cli ping
# Should return: PONG
```

### Then Start Backend

```powershell
# Terminal 1 - Backend
cd G:\Projects\VistaraBI\backend
npm run dev

# Terminal 2 - Worker
cd G:\Projects\VistaraBI\backend
npm run worker

# Terminal 3 - Frontend (already running on 3001)
# Just open http://localhost:3001
```

## Option 2: Use Memurai (Redis for Windows) ⭐ Alternative

### Download and Install

1. Go to https://www.memurai.com/get-memurai
2. Download Memurai (Free for development)
3. Install it
4. It runs as a Windows service automatically

### Verify

```powershell
# Test connection
memurai-cli ping
# Should return: PONG
```

### Update Backend Config

```powershell
# Edit backend/.env if needed
# REDIS_URL=redis://localhost:6379
# (Should already be correct)
```

### Start Backend

Same as Option 1 above.

## Option 3: Manual Redis Setup (Advanced)

### Download Redis for Windows

1. Go to https://github.com/microsoftarchive/redis/releases
2. Download `Redis-x64-3.0.504.zip`
3. Extract to `C:\Redis`

### Start Redis Manually

```powershell
cd C:\Redis
.\redis-server.exe redis.windows.conf
```

**Keep this terminal open** - Redis is running here.

### Start Backend

Open **new terminals** for:
1. Backend server
2. Background worker
3. Frontend (optional, already running)

## Option 4: Start Docker Desktop Manually 🐋

### Start Docker Desktop

1. Press Windows key
2. Search for "Docker Desktop"
3. Click to start the application
4. Wait for it to fully start (green light in system tray)

### Then Run Redis

```powershell
docker run -d --name vistarabi-redis -p 6379:6379 redis:7-alpine

# Verify
docker ps
docker exec vistarabi-redis redis-cli ping
```

## Option 5: Use WSL2 (Windows Subsystem for Linux)

### Enable WSL2 (if not enabled)

```powershell
# As Administrator
wsl --install
# Restart computer if needed
```

### Install Redis in WSL

```powershell
# Open WSL
wsl

# In WSL terminal:
sudo apt-get update
sudo apt-get install redis-server -y

# Start Redis
sudo service redis-server start

# Verify
redis-cli ping
# Should return: PONG

# Keep WSL running in background
exit
```

### Start Backend

Redis is now running in WSL on localhost:6379. Your backend will connect to it automatically.

## Fastest Solution: One-Line Setup

If you have **Administrator PowerShell**, run this:

```powershell
# Install Chocolatey + Redis
Set-ExecutionPolicy Bypass -Scope Process -Force; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1')); choco install redis-64 -y; redis-server --service-start; redis-cli ping
```

Wait for "PONG", then:

```powershell
# Start backend (new terminal, normal user)
cd G:\Projects\VistaraBI\backend
npm run dev

# Start worker (another new terminal)
cd G:\Projects\VistaraBI\backend
npm run worker
```

## Testing Without Redis (Temporary Workaround)

If you can't install Redis right now, you can modify the backend to process files synchronously:

### Quick Modification

Edit `backend/src/controllers/upload.controller.js`:

```javascript
// Find this section (around line 20):
await uploadQueue.add('process-file', {
  uploadId: upload.id,
  fileName: upload.fileName,
  fileType: upload.fileType
});

// Replace with:
// Process immediately without queue
const fileProcessor = require('../services/fileProcessor');
await fileProcessor.process({
  uploadId: upload.id,
  fileName: upload.fileName,
  fileType: upload.fileType
});

// Update status to completed
await prisma.upload.update({
  where: { id: upload.id },
  data: { status: 'completed' }
});
```

**Then:**
- You only need to start backend server (no worker needed)
- Files will process immediately (slower for large files)
- No Redis required

Want me to make this change?

## Current Status

✅ Frontend running on port 3001
✅ PostgreSQL running
❌ Redis not running
❌ Backend not running
❌ Worker not running

## Recommended Next Steps

1. **Choose one option above** (I recommend Option 1: Chocolatey)
2. **Install Redis**
3. **Start backend and worker**
4. **Test upload** at http://localhost:3001

## Need Help?

**Can't run as Administrator?**
→ Use Option 4 (start Docker Desktop manually) or ask IT to install Redis

**Don't want to install anything?**
→ I can modify the code to work without Redis (synchronous processing)

**Just want it to work now?**
→ Start Docker Desktop manually, then run:
```powershell
docker run -d --name vistarabi-redis -p 6379:6379 redis:7-alpine
cd backend
npm run dev
# (new terminal)
npm run worker
```

---

**What would you like to do?**
1. Install Redis via Chocolatey (I'll guide you)
2. Start Docker Desktop manually (then I'll start Redis)
3. Modify code to work without Redis (synchronous processing)
4. Something else?
