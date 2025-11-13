# 🧪 Testing Instructions - Report Display Issue

## Current Status
- Frontend: Running on http://localhost:3000
- Backend: Should be on http://localhost:5001
- Added console.log debugging to track the flow

## How to Test the Report Display

### Step 1: Verify Both Servers Are Running

Open browser console (F12) and check for errors.

**Check Backend:**
```
http://localhost:5001/api/v1
```
Should show: "VistaraBI API is running"

**Check Frontend:**
```
http://localhost:3000
```
Should load the upload page

### Step 2: Upload a Test CSV File

Create a file called `test-data.csv` with this content:

```csv
Name,Age,Email,Salary,City
John Doe,25,john@example.com,50000,New York
Jane Smith,,jane@example.com,60000,
Bob Johnson,30,bob@example,70000,Chicago
Alice Brown,35,alice@example.com,,Boston
John Doe,25,john@example.com,50000,New York
Mary Wilson,28,mary@example.com,55000,Seattle
```

Upload this file through the UI.

### Step 3: Run Data Cleaning

1. After upload, click "Proceed to Cleaning"
2. Auto-detection will run automatically (watch console logs)
3. Review the detected configuration
4. Click "Start Cleaning"

### Step 4: Watch Console Logs

You should see logs like:
```
🧹 Starting cleaning with config: {...}
✅ Cleaning job started: {...}
   Job ID: some-uuid-here
   Status: completed/running
🔄 Navigating to report page: /cleaning/some-uuid/report
📊 Loading report for job: some-uuid
📡 Fetching report from API...
```

### Step 5: Check for Errors

If you see:
- ❌ **404 Not Found**: Route not configured properly
- ❌ **Network Error**: Backend not running or wrong port
- ❌ **CORS Error**: CORS configuration issue
- ❌ **500 Server Error**: Backend error (check backend logs)

### Expected Behavior

After clicking "Start Cleaning":
1. Job starts immediately
2. Page navigates to `/cleaning/:jobId/report`
3. Report page shows loading spinner
4. Report loads with:
   - Executive Summary (4 cards with numbers)
   - Pipeline Stages (Imputation, Outliers, Dedup, Standardization)
   - Operation Log
   - Download buttons

### Common Issues and Fixes

#### Issue 1: "Failed to load report"
**Symptoms**: Error message on report page
**Check**:
- Is backend running? `netstat -ano | findstr :5001`
- Is job ID valid? Check console logs
- Did cleaning complete? Check backend logs

**Fix**:
```powershell
# Start backend
cd C:\Projects\VistaraBI\backend
$env:PORT=5001
npm run dev
```

#### Issue 2: Report shows but data is missing
**Symptoms**: Empty sections, "0" everywhere
**Check**:
- Console logs for the report data structure
- Network tab for API response

**Fix**: The job may not have completed yet. The issue is that we navigate to the report immediately after starting the job, but the job might still be running.

**Solution**: We need to either:
a) Poll for job completion before navigating
b) Show loading state on report page while job completes
c) Use websockets for real-time updates

#### Issue 3: Navigation doesn't happen
**Symptoms**: Stays on config page, spinner keeps spinning
**Check**: Console for errors

#### Issue 4: Backend not responding
**Symptoms**: Network errors, ECONNREFUSED
**Fix**:
```powershell
# Check if something is on port 5001
netstat -ano | findstr :5001

# If yes, kill it
taskkill /PID <pid> /F

# Start backend fresh
cd C:\Projects\VistaraBI\backend
$env:PORT=5001
npm run dev
```

## What to Look For in Console

### Good Flow:
```
🧹 Starting cleaning with config: {...}
✅ Cleaning job started: {id: "abc-123", status: "completed"}
🔄 Navigating to report page: /cleaning/abc-123/report
📊 Loading report for job: abc-123
📡 Fetching report from API...
✅ Report loaded successfully: {job: {...}, logs: [...], report: {...}}
```

### Bad Flow:
```
🧹 Starting cleaning with config: {...}
❌ Cleaning failed: Network Error
```

or

```
🧹 Starting cleaning with config: {...}
✅ Cleaning job started: {id: "abc-123", status: "running"}
🔄 Navigating to report page: /cleaning/abc-123/report
📊 Loading report for job: abc-123
📡 Fetching report from API...
❌ Report loading failed: AxiosError: Request failed with status code 404
```

## Debug Commands

### Check Backend Status:
```powershell
Invoke-WebRequest -Uri "http://localhost:5001/api/v1" -UseBasicParsing
```

### Check Frontend Build:
```powershell
cd C:\Projects\VistaraBI\frontend
npm run dev
```

### View Backend Logs:
Look at the terminal where `npm run dev` is running in backend folder

### Check Database:
```powershell
cd C:\Projects\VistaraBI\backend
npx prisma studio
```
This opens a GUI to view database contents.

## Next Steps After Testing

Once you test and report what you see, I can:
1. Fix the specific error
2. Add polling mechanism to wait for job completion
3. Improve error handling
4. Add loading states

Please test and let me know:
- What console logs you see
- What error message appears (if any)
- Screenshot of the report page if it loads
- Network tab showing the API calls
