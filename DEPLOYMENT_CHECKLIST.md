# Vistara BI - Module 1 Deployment Checklist

## Pre-Deployment Checklist

### Environment Setup
- [ ] PostgreSQL 15+ installed and running
- [ ] Redis 7+ installed and running
- [ ] Node.js 18+ installed
- [ ] Git installed

### Database Setup
- [ ] Database `vistarabi` created
- [ ] User `vistarabi` created with password
- [ ] User has proper permissions
- [ ] Can connect: `psql -U vistarabi -d vistarabi`

### Backend Setup
- [ ] Dependencies installed: `npm install`
- [ ] `.env` file created from `.env.example`
- [ ] DATABASE_URL configured correctly
- [ ] REDIS_URL configured correctly
- [ ] Prisma client generated: `npx prisma generate`
- [ ] Database migrations run: `npx prisma migrate dev`
- [ ] Uploads directory exists: `backend/uploads/`

### Frontend Setup
- [ ] Dependencies installed: `npm install`
- [ ] `.env` file created from `.env.example`
- [ ] VITE_API_URL configured correctly

## Running Services Checklist

### Services Status
- [ ] PostgreSQL service running
- [ ] Redis service running
- [ ] Backend server running on port 5000
- [ ] Background worker running
- [ ] Frontend dev server running on port 3000

### Health Checks
- [ ] Backend health: `curl http://localhost:5000/api/health`
- [ ] Frontend loads: http://localhost:3000
- [ ] Backend status shows "online" in UI
- [ ] No console errors in browser
- [ ] No errors in backend terminal
- [ ] No errors in worker terminal

## Testing Checklist

### Basic Upload Test
- [ ] Can drag and drop a file
- [ ] Upload progress shows correctly
- [ ] Status changes to "Processing"
- [ ] Records count updates
- [ ] Status changes to "Completed"
- [ ] Table name is displayed
- [ ] No errors in any terminal

### File Type Tests
- [ ] CSV file upload works
- [ ] JSON file upload works
- [ ] Excel (.xlsx) file upload works
- [ ] XML file upload works
- [ ] Large file (>10MB) upload works

### Error Handling Tests
- [ ] Invalid file type rejected
- [ ] File too large rejected
- [ ] Failed upload shows error
- [ ] Retry button works
- [ ] Remove button works

### Database Verification
- [ ] Upload record created in `uploads` table
- [ ] Dynamic table created with correct name
- [ ] Data inserted correctly
- [ ] Schema matches file structure
- [ ] Check via Prisma Studio: `npx prisma studio`

## Performance Checklist

### Upload Performance
- [ ] Multiple files can be uploaded
- [ ] Progress updates smoothly
- [ ] No memory leaks during upload
- [ ] Worker processes files without lag

### Database Performance
- [ ] Batch inserts work efficiently
- [ ] No deadlocks or timeouts
- [ ] Large files process successfully
- [ ] Multiple concurrent uploads work

## Production Readiness Checklist

### Security
- [ ] Environment variables not committed
- [ ] File type validation working
- [ ] File size limits enforced
- [ ] SQL injection prevention in place
- [ ] CORS properly configured

### Monitoring
- [ ] Backend logs are clear and helpful
- [ ] Worker logs show processing status
- [ ] Error messages are informative
- [ ] Can track upload status easily

### Documentation
- [ ] README.md updated
- [ ] SETUP_GUIDE.md reviewed
- [ ] MODULE_1_README.md accurate
- [ ] API documentation complete

## Troubleshooting Checklist

### If Backend Won't Start
- [ ] Check PostgreSQL is running
- [ ] Check Redis is running
- [ ] Verify DATABASE_URL is correct
- [ ] Check port 5000 is available
- [ ] Review backend logs for errors

### If Worker Won't Process Files
- [ ] Check Redis connection
- [ ] Verify worker is running
- [ ] Check worker logs
- [ ] Restart worker process
- [ ] Check queue in Redis: `redis-cli`

### If Frontend Won't Connect
- [ ] Backend is running
- [ ] VITE_API_URL is correct
- [ ] Check browser console
- [ ] Check network tab
- [ ] Clear browser cache

### If Upload Fails
- [ ] Check file type is supported
- [ ] Verify file size < 1 GB
- [ ] Backend logs for errors
- [ ] Worker logs for parsing errors
- [ ] Database permissions

### If Processing Hangs
- [ ] Check worker is running
- [ ] Check Redis connection
- [ ] Review worker logs
- [ ] Check database connection
- [ ] Restart worker

## Final Verification

### End-to-End Test
1. [ ] Start PostgreSQL
2. [ ] Start Redis
3. [ ] Start backend server
4. [ ] Start worker
5. [ ] Start frontend
6. [ ] Upload `test_data/sample.csv`
7. [ ] Verify upload completes
8. [ ] Check data in Prisma Studio
9. [ ] Upload `test_data/sample.json`
10. [ ] Verify both uploads in database

### Demo Preparation
- [ ] All services running smoothly
- [ ] No errors in any console
- [ ] Test files ready
- [ ] Demo script prepared
- [ ] Backup plan if something fails

## Sign-Off

- [ ] All features implemented as per blueprint
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Ready for demonstration
- [ ] Ready for next module

---

**Date:** __________  
**Verified By:** __________  
**Status:** ⬜ Ready / ⬜ Not Ready  

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________
