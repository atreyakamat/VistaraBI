# 🚀 VistaraBI Production Deployment Checklist
**Status: READY FOR DEPLOYMENT**

---

## Pre-Deployment (24 hours before)

### Code & Testing
- [ ] Pull latest from main branch
- [ ] Run `npm run test:unit` - verify all tests pass
- [ ] Run `npm run build` - verify no build errors
- [ ] Run `npm run lint` - verify no linting issues
- [ ] Run `npm run type-check` - verify no TypeScript errors
- [ ] Review `COMPLETE_TEST_EXECUTION_REPORT.md`

### Database
- [ ] Create full database backup
- [ ] Verify migrations are up to date
- [ ] Test database connection from production environment
- [ ] Verify database user permissions
- [ ] Confirm database size and available space

### Infrastructure
- [ ] Verify production server is ready
- [ ] Check server specs meet requirements (8GB+ RAM, 4+ CPU)
- [ ] Verify network connectivity and firewall rules
- [ ] Test DNS records (if domain change)
- [ ] Verify SSL certificates are valid

### Environment
- [ ] Update `.env.production` with correct values
- [ ] Verify database connection string
- [ ] Verify API keys for all services (Ollama, etc.)
- [ ] Set log levels appropriately
- [ ] Configure monitoring and alerting

### Team & Communication
- [ ] Notify all stakeholders of deployment time
- [ ] Prepare status update template
- [ ] Assign on-call engineer
- [ ] Test communication channels
- [ ] Prepare rollback procedure

### Documentation
- [ ] Print or bookmark deployment guide
- [ ] Print or bookmark rollback procedure
- [ ] Have team contact list available
- [ ] Have database credentials saved securely
- [ ] Have SSH keys ready

---

## Deployment Day - Phase 1: Pre-Deployment (T-1 hour)

### Final Checks (30 minutes before)
- [ ] Verify database backup completed successfully
- [ ] Verify production server is accessible
- [ ] Verify all team members are available
- [ ] Send "deployment starting" notification
- [ ] Stop any scheduled jobs (data imports, reports)
- [ ] Clear application cache if applicable

### System State
- [ ] Verify current application is running smoothly
- [ ] Check system resource usage (CPU, memory, disk)
- [ ] Verify all API endpoints responding normally
- [ ] Test database connections
- [ ] Verify log files are writable

### Preparation
- [ ] Have rollback script ready
- [ ] Have previous version branch checked out
- [ ] Open deployment guide on screen
- [ ] Open monitoring dashboard
- [ ] Have command terminals ready

---

## Deployment Day - Phase 2: Deploy (T-0 to T+1 hour)

### Before Stopping Current App
- [ ] Notify users (if needed): "Maintenance starting in 5 minutes"
- [ ] Drain pending requests (wait for queue to empty)
- [ ] Stop accepting new requests (enable maintenance mode)
- [ ] Wait 30 seconds for pending requests to complete

### Stop Current Application
- [ ] Stop web server: `sudo systemctl stop vistarabi` (or equivalent)
- [ ] Wait for graceful shutdown (max 30 seconds)
- [ ] Verify process stopped: `ps aux | grep vistarabi`
- [ ] Verify port is released: `lsof -i :3000` (should show nothing)

### Database Migration (if needed)
- [ ] Run migrations: `npm run prisma:migrate:deploy`
- [ ] Verify migration completed successfully
- [ ] Check for errors in output
- [ ] Verify database schema updated

### Deploy New Code
- [ ] Extract or pull new code to production directory
- [ ] Install dependencies: `npm ci --production`
- [ ] Build application: `npm run build`
- [ ] Verify build completed successfully
- [ ] Verify no build errors or warnings
- [ ] Check new version deployed correctly: `git describe --tags`

### Start Application
- [ ] Start web server: `sudo systemctl start vistarabi`
- [ ] Wait 10 seconds for startup
- [ ] Verify process started: `ps aux | grep vistarabi`
- [ ] Verify port listening: `lsof -i :3000` (should show listening)
- [ ] Check application logs for errors: `tail -50 /var/log/vistarabi.log`

### Smoke Tests (First 5 minutes)
- [ ] Test homepage loads: `curl -I http://localhost:3000`
- [ ] Test API health: `curl http://localhost:3000/api/health`
- [ ] Test database connection: Check logs
- [ ] Test Ollama service: Check logs
- [ ] Open UI in browser and verify load

---

## Deployment Day - Phase 3: Validation (T+1 to T+4 hours)

### Immediate Testing (5 minutes)
- [ ] Homepage loads without errors
- [ ] Login page accessible
- [ ] Dashboard page accessible
- [ ] API endpoints responding (check 5 endpoints)
- [ ] Database queries working
- [ ] No error logs in output

### Functional Testing (30 minutes)
- [ ] Create test project
- [ ] Upload test data file
- [ ] Verify data processing
- [ ] Generate dashboard
- [ ] Test KPI calculations
- [ ] Test report generation
- [ ] Test AI explanations
- [ ] Verify all chart types load
- [ ] Test export functions

### Performance Testing (15 minutes)
- [ ] Dashboard load time <500ms
- [ ] API responses <2s
- [ ] Database queries <1s
- [ ] Memory usage stable
- [ ] CPU usage normal
- [ ] No errors in logs

### Monitoring (Continuous)
- [ ] Watch error rate (should be <0.1%)
- [ ] Watch response times (should be consistent)
- [ ] Watch resource usage (CPU, memory, disk)
- [ ] Check for any warnings or errors
- [ ] Verify data integrity

### User Communication
- [ ] Send "deployment successful" notification
- [ ] Provide access information to users
- [ ] Ask users to report any issues
- [ ] Monitor feedback channels
- [ ] Plan follow-up check-in

---

## If Issues Occur - Rollback Procedure

### Identify Issue
- [ ] Note error message and time
- [ ] Check application logs
- [ ] Check database logs
- [ ] Note which feature is failing
- [ ] Assess severity (critical vs. non-critical)

### Quick Fixes First (before rollback)
- [ ] Check if issue is temporary (API timeouts, etc.)
- [ ] Try restarting service: `sudo systemctl restart vistarabi`
- [ ] Wait 30 seconds and test again
- [ ] Check if previous version has same issue

### Decision Point
**Is issue critical and unfixable in <15 minutes?**
- [ ] **NO:** Continue troubleshooting (notify team)
- [ ] **YES:** Proceed with rollback (below)

### Initiate Rollback
- [ ] Notify all stakeholders: "Rolling back due to [issue]"
- [ ] Enable maintenance mode
- [ ] Stop application: `sudo systemctl stop vistarabi`
- [ ] Restore previous code: `git checkout [previous-tag]`
- [ ] Run rollback script (if needed): `npm run rollback`

### Restore Application
- [ ] Install dependencies: `npm ci --production`
- [ ] Build application: `npm run build`
- [ ] Start application: `sudo systemctl start vistarabi`
- [ ] Run smoke tests (see above)
- [ ] Verify application restored
- [ ] Notify users: "Service restored"

### Post-Rollback
- [ ] Document what went wrong
- [ ] Schedule debugging session
- [ ] Fix issue and test thoroughly
- [ ] Plan re-deployment for next day
- [ ] Update deployment notes

---

## Post-Deployment Day 1

### Morning Check (T+16 hours)
- [ ] Verify application still running
- [ ] Check error logs for overnight issues
- [ ] Verify data integrity
- [ ] Check response times
- [ ] Verify resource usage normal
- [ ] Read user feedback (if any)

### Day 1 Validation (T+24 hours)
- [ ] All critical features working
- [ ] No error rate increase
- [ ] Response times consistent
- [ ] Database performing well
- [ ] Users report no issues
- [ ] System appears stable

### If Issues Found
- [ ] Assign to engineer immediately
- [ ] Fix with careful testing
- [ ] Deploy hotfix if urgent
- [ ] Or schedule fix for next deployment window
- [ ] Keep users informed

---

## Post-Deployment Week 1

### Daily Checks
- [ ] [ ] Day 2: Verify stability maintained
- [ ] [ ] Day 3: Check for any delayed issues
- [ ] [ ] Day 4: Verify performance remains good
- [ ] [ ] Day 5: Collect user feedback
- [ ] [ ] Day 6-7: Monitor weekday usage

### Weekly Validation (Day 5)
- [ ] All features working as expected
- [ ] Error rate <0.1%
- [ ] Performance meets targets
- [ ] No memory leaks
- [ ] Users satisfied
- [ ] No critical issues

### Documentation
- [ ] Update deployment log
- [ ] Document any issues encountered
- [ ] Update troubleshooting guide
- [ ] Plan optimization (if needed)
- [ ] Schedule next deployment review

---

## Monitoring Alerts to Watch

### Critical Alerts (Page On-Call)
```
Alert: "Application Down" → Check process status, restart if needed
Alert: "Database Error Rate >1%" → Check database logs, rollback if needed
Alert: "Error Rate >1%" → Check application logs, investigate error
Alert: "Out of Memory" → Check memory usage, identify leak
Alert: "Disk Space <10%" → Investigate large files, clean up if needed
```

### High Priority Alerts (1 hour response)
```
Alert: "Response Time >5s" → Check database, API, server resources
Alert: "Database Slow Queries" → Check query logs, optimize if needed
Alert: "CPU Usage >80%" → Check process list, investigate spike
Alert: "Cache Hit Rate <50%" → Check cache configuration
Alert: "SSL Certificate Expiring Soon" → Renew certificate
```

### Medium Priority Alerts (4 hour response)
```
Alert: "Warning Logs Increasing" → Check what's generating warnings
Alert: "Disk Usage >80%" → Plan cleanup, investigate growth
Alert: "Performance Degrading" → Monitor and investigate
Alert: "Deployment Failed" → Review logs, fix issue
```

---

## Key Contacts & Resources

### Emergency Contacts
- **On-Call Engineer:** [Name, phone, email]
- **Tech Lead:** [Name, phone, email]
- **DevOps Lead:** [Name, phone, email]
- **Escalation:** [Process, phone, email]

### Important URLs
- **Application:** http://[production-domain]
- **Monitoring:** [Monitoring dashboard URL]
- **Logs:** [Log aggregation service URL]
- **Database:** [Database admin URL, if applicable]

### Documentation Links
- Production Deployment Guide: `PRODUCTION_DEPLOYMENT.md`
- Troubleshooting Guide: `TROUBLESHOOTING.md`
- Test Report: `COMPLETE_TEST_EXECUTION_REPORT.md`
- Architecture: `GEMINI.md`
- Rollback Procedure: `ROLLBACK_PROCEDURE.md`

### Important Commands
```bash
# View logs
tail -50 /var/log/vistarabi.log
tail -f /var/log/vistarabi.log

# Check service status
sudo systemctl status vistarabi

# Restart service
sudo systemctl restart vistarabi

# Check resources
ps aux | grep vistarabi
lsof -i :3000

# Database commands
npm run prisma:studio
npm run prisma:db:push
npm run prisma:migrate:deploy

# Rollback database
npm run rollback

# Scale up (if needed)
docker-compose up --scale api=3
```

---

## Success Criteria

### Deployment Successful If ✅
- [x] Application starts without errors
- [x] All smoke tests pass
- [x] Dashboard loads in <500ms
- [x] API responds in <2s
- [x] No critical errors in logs
- [x] Database queries succeed
- [x] Users can access features
- [x] Error rate <0.1%
- [x] Memory usage stable
- [x] CPU usage normal

### Deployment Failed If ❌
- [ ] Application won't start
- [ ] Critical errors in logs
- [ ] API returning 500 errors
- [ ] Database connection failed
- [ ] Dashboard won't load
- [ ] Error rate >1%
- [ ] Memory usage increasing
- [ ] Performance degraded significantly
- [ ] Data corrupted

---

## Deployment Sign-Off

**Prepared By:** [Name] Date: [Date]  
**Reviewed By:** [Name] Date: [Date]  
**Approved By:** [Name] Date: [Date]  

**Deployment Date:** [Date] [Time] UTC  
**Deployed By:** [Name]  
**Duration:** [Actual duration]  
**Status:** ✅ SUCCESSFUL / ❌ ROLLED BACK  

**Notes:**
```
[Add any important notes about the deployment here]
```

---

## Archive & Lessons Learned

**Date Deployed:** [Date]  
**Version Deployed:** [Tag/Commit]  
**Deployment Duration:** [Minutes]  
**Issues Encountered:** [None/List]  
**Resolutions Applied:** [List]  
**Performance Improvement:** [If any]  
**User Feedback:** [Positive/Issues]  

**Lessons for Next Deployment:**
1. [Lesson 1]
2. [Lesson 2]
3. [Lesson 3]

---

**Document Version:** 1.0  
**Last Updated:** January 5, 2025  
**Status:** READY FOR USE  
**Next Review:** Post-deployment (1 week)

---

🎉 **Good luck with your deployment! The VistaraBI team has worked hard to ensure this is a smooth process.**

**Remember:** In case of emergency, see "If Issues Occur - Rollback Procedure" section above.
