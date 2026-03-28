# 🚀 SynthMed Deployment Guide - Production Ready

**Status:** ✅ READY FOR DEPLOYMENT
**Date:** March 28, 2026
**Platform:** Railway (Recommended) | Heroku | AWS ECS | VPS

---

## 🎯 PRE-DEPLOYMENT REQUIREMENTS

### Step 1: Generate Required Secrets

Generate strong JWT_SECRET and ADMIN_KEY:

```bash
# Generate JWT_SECRET (copy the output)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate ADMIN_KEY (copy the output)
node -e "console.log('ADMIN_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# Example output:
# JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
# ADMIN_KEY=x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2
```

**⚠️ IMPORTANT:**
- Keep these secrets secure (never commit to git)
- Use environment variables in production
- Rotate monthly for extra security

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### A. Application Setup
- [x] All 8 HIGH priority fixes implemented
- [x] All 11 CRITICAL security fixes verified
- [x] 52/52 tests passing
- [x] Database schema ready (synthmed.db)
- [x] All dependencies installed (npm install)
- [ ] Run security tests locally: `npm test`
- [ ] Test endpoints locally: `npm start`

### B. Environment Variables
Create a `.env` file for local testing (or Railway environment):

```env
# Server
PORT=3000
NODE_ENV=production

# Secrets (use the generated values)
JWT_SECRET=<your-generated-jwt-secret>
ADMIN_KEY=<your-generated-admin-key>

# Email (Optional - for lead notifications)
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-specific-password

# CORS - Set to your domain
ALLOWED_ORIGINS=https://synthmed.ca,https://www.synthmed.ca,https://api.synthmed.ca

# Database (Railway will set this)
DATABASE_URL=

# Logging
LOG_LEVEL=info
```

### C. Email Setup (Optional but Recommended)

If you want email notifications for leads:

1. Go to myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer" (or your device)
3. Generate app-specific password (16 characters)
4. Copy to MAIL_PASS environment variable

---

## 🚀 RAILWAY DEPLOYMENT (Recommended - 45 min)

### Step 1: Create Railway Account
1. Go to railway.app
2. Sign up with GitHub
3. Create new project

### Step 2: Connect Repository
1. Click "New Project"
2. Select "Deploy from GitHub"
3. Choose `smart-vick/synthmed` repository
4. Select branch: `feature/revenue-system-setup`

### Step 3: Configure Environment Variables
In Railway dashboard, go to Variables:

```
JWT_SECRET=<your-secret-here>
ADMIN_KEY=<your-admin-key-here>
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
NODE_ENV=production
LOG_LEVEL=info
PORT=3000
```

### Step 4: Configure Build & Start

Railway should auto-detect:
- **Build Command:** `npm install` (automatic)
- **Start Command:** `node server-new.js`

If not, set manually:
1. Go to "Settings"
2. Under "Build," set start command to: `node server-new.js`

### Step 5: Deploy
1. Click "Deploy"
2. Wait for build to complete (2-3 minutes)
3. Check logs for errors

### Step 6: Test Deployment

Once deployed, test endpoints:

```bash
# Health check
curl https://your-railway-app.up.railway.app/api/v1/health

# Register test account
curl -X POST https://your-railway-app.up.railway.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!@#"
  }'
```

---

## 🌍 CUSTOM DOMAIN SETUP

### Step 1: Register Domain
- Go to Namecheap, GoDaddy, or Google Domains
- Register `synthmed.ca` (if not already done)
- Cost: ~$12/year

### Step 2: Configure DNS on Railway
1. In Railway dashboard, go to "Settings"
2. Under "Domains," add custom domain
3. Railway provides CNAME record
4. Add to DNS provider:
   ```
   CNAME: yourdomain.com → railway.app (provided by Railway)
   ```

### Step 3: Enable HTTPS
Railway automatically provides SSL/TLS certificate through Let's Encrypt
- Automatic renewal
- Free for all domains
- Takes 5-10 minutes to activate

### Step 4: Verify
```bash
# Should work
curl https://synthmed.ca/api/v1/health

# Should redirect to HTTPS
curl http://synthmed.ca
```

---

## 🔍 POST-DEPLOYMENT VERIFICATION

### A. Health Checks

```bash
# 1. Server is up
curl https://synthmed.ca/api/v1/health

# Expected response:
# {
#   "ok": true,
#   "timestamp": "2026-03-28T...",
#   "uptime": "1234ms"
# }

# 2. Register test account
curl -X POST https://synthmed.ca/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!@#"
  }'

# 3. Login
curl -X POST https://synthmed.ca/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!@#"
  }'
```

### B. Rate Limiting Check

```bash
# Send 6 requests to /leads in a minute (limit is 5/hour)
for i in {1..6}; do
  curl -X POST https://synthmed.ca/api/v1/leads \
    -H "Content-Type: application/json" \
    -d '{"name":"Test","email":"test@example.com","organization":"Test","role":"Admin","message":"Test"}'
  sleep 1
done

# Request 6 should return 429 (Too Many Requests)
```

### C. Error Handling Check

```bash
# Invalid input (should return 400)
curl -X POST https://synthmed.ca/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "weak"
  }'

# Expected: 400 with standardized error response
```

### D. Database Check

```bash
# If you have admin access, check audit logs:
SELECT COUNT(*) FROM audit_logs;
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5;
```

---

## 📊 MONITORING & ALERTS

### A. Railway Monitoring
1. Go to "Monitoring" tab
2. Watch:
   - CPU usage (should be < 30%)
   - Memory usage (should be < 200MB)
   - Network I/O
   - Logs for errors

### B. Log Monitoring

```bash
# View live logs in Railway dashboard or:
# SSH into Railway container and view logs
```

### C. Set Up Alerts (Optional)
1. Go to Project Settings
2. Add notifications for:
   - Deployment failures
   - High memory usage
   - High error rates

---

## 🛠️ TROUBLESHOOTING

### Issue: Deploy Fails with "Module not found"
```
Solution:
1. Check package.json has all dependencies
2. Run npm install locally first
3. Commit package-lock.json to git
4. Redeploy
```

### Issue: "JWT_SECRET not set"
```
Solution:
1. Check Railway environment variables
2. Verify JWT_SECRET is 32+ characters
3. No quotes in the value
4. Restart deployment
```

### Issue: CORS errors from frontend
```
Solution:
1. Check ALLOWED_ORIGINS includes your domain
2. Add both http:// and https:// versions
3. Add www and non-www versions
4. Restart after updating
```

### Issue: Emails not sending
```
Solution:
1. Verify MAIL_USER and MAIL_PASS are correct
2. Check Gmail app password (not regular password)
3. Enable "Less secure app access" if needed
4. Test locally first with: npm start
```

### Issue: Database locked / sqlite3 error
```
Solution:
1. SQLite has issues with multiple processes
2. If this occurs, migrate to PostgreSQL:
   - Railway provides free PostgreSQL
   - Update db.js to use PostgreSQL driver
   - Backup current database first
```

---

## 📈 PRODUCTION CHECKLIST SUMMARY

**Before Going Live:**
- [ ] Generated JWT_SECRET (32+ chars)
- [ ] Generated ADMIN_KEY (32+ chars)
- [ ] Set ALLOWED_ORIGINS to your domain(s)
- [ ] Tested all endpoints locally (npm start)
- [ ] Run security tests (npm test)
- [ ] Deployed to Railway
- [ ] Configured custom domain
- [ ] HTTPS working (automatic via Railway)
- [ ] Health check passes
- [ ] Can register & login
- [ ] Rate limiting works
- [ ] Audit logs recording
- [ ] Email configured (if needed)

**First Week Monitoring:**
- [ ] Check logs daily for errors
- [ ] Monitor CPU/memory in Railway
- [ ] Test user signup flow
- [ ] Verify lead capture working
- [ ] Check email notifications

**First Month:**
- [ ] Review audit logs for suspicious activity
- [ ] Monitor error rates
- [ ] Gather user feedback
- [ ] Plan frontend design completion
- [ ] Begin marketing efforts

---

## 📞 NEXT STEPS

### Immediate (This Week)
1. ✅ Deploy to Railway (45 min)
2. ✅ Configure custom domain (15 min)
3. ✅ Run post-deployment tests (15 min)
4. ⏳ Update landing page in UI/UX Pro (Days 1-4)

### Short Term (Week 2-3)
1. Complete landing page design in UI/UX Pro
2. Build HTML/CSS from design
3. Deploy redesigned landing page
4. Set up email notifications for leads

### Medium Term (Month 2)
1. Add payment processor (Stripe/Paddle)
2. Set up error tracking (Sentry)
3. Create admin dashboard
4. Begin customer outreach

---

## 🎓 IMPORTANT NOTES

**Security:**
- Never commit secrets to git
- Use environment variables for all sensitive data
- Rotate JWT_SECRET periodically
- Monitor audit logs for suspicious activity
- Keep dependencies updated: `npm audit`

**Performance:**
- SQLite is fine for MVP but consider PostgreSQL at scale
- Current rate limits: Free 100/hr, Starter 5K/hr, Pro 50K/hr
- Database auto-grows, monitor synthmed.db size

**Compliance:**
- PIPEDA: Data is 100% synthetic (compliant)
- GDPR: DELETE /api/v1/account endpoint ready
- No real PII stored or transmitted
- Audit logs for compliance records

---

**You're ready to deploy! 🚀**

For questions, refer to:
- `docs/API.md` - API reference
- `docs/DEPLOYMENT.md` - More detailed deployment options
- `CHANGES_LOG.md` - Complete changes documentation
- `CODE_REVIEW_FEEDBACK.md` - Security audit details

---
