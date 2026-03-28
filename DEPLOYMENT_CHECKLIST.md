# 🚀 DEPLOYMENT CHECKLIST & POST-DEPLOYMENT ROADMAP

**Objective:** Deploy current SynthMed to production, then iterate
**Platform:** Railway
**Timeline:** Deploy now, test, then decide on improvements

---

## 📋 PRE-DEPLOYMENT REQUIREMENTS

### ✅ IMMEDIATE (Required to Deploy)

#### 1. Generate Secrets (Do this first!)
```bash
# Generate JWT_SECRET (32+ characters)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Example output:
# JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0

# Generate ADMIN_KEY (32+ characters)
node -e "console.log('ADMIN_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# Example output:
# ADMIN_KEY=x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0

# Save these values! ⚠️ Keep them secret
```

#### 2. Prepare Environment Variables
```env
# Copy these to Railway environment variables

# Required (from above)
JWT_SECRET=<your-generated-secret>
ADMIN_KEY=<your-generated-admin-key>

# Server
PORT=3000
NODE_ENV=production

# Email (Optional - for lead notifications)
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-specific-password

# CORS
ALLOWED_ORIGINS=https://synthmed.ca,https://www.synthmed.ca,https://api.synthmed.ca

# Database (Railway will set this)
DATABASE_URL=

# Logging
LOG_LEVEL=info
```

#### 3. Register Domain (If Not Done)
- Domain: synthmed.ca (or yourdomain.com)
- Registrar: Namecheap, GoDaddy, Google Domains
- Cost: ~$12/year
- Keep: Domain credentials ready

#### 4. Verify Files Are Committed
```bash
git status
# Should show: "nothing to commit, working tree clean"

git log --oneline | head -5
# Should show recent commits
```

---

## 🚀 DEPLOYMENT STEPS (Railway)

### **Step 1: Create Railway Account** (5 min)
```
1. Go to railway.app
2. Click "Sign Up"
3. Choose "GitHub" authentication
4. Authorize Railway to access your repos
5. Create workspace (free tier)
```

### **Step 2: Create New Project** (5 min)
```
1. Click "New Project"
2. Select "Deploy from GitHub"
3. Search for "synthmed" repository
4. Click to connect
5. Select branch: feature/revenue-system-setup
```

### **Step 3: Configure Variables** (5 min)
```
In Railway Dashboard:
1. Go to Variables tab
2. Add all environment variables:
   ├─ JWT_SECRET=<your-secret>
   ├─ ADMIN_KEY=<your-admin-key>
   ├─ NODE_ENV=production
   ├─ MAIL_USER=<your-email>
   ├─ MAIL_PASS=<your-app-password>
   ├─ ALLOWED_ORIGINS=https://synthmed.ca
   └─ LOG_LEVEL=info
```

### **Step 4: Deploy** (10 min)
```
In Railway Dashboard:
1. Click "Deploy"
2. Watch build logs for errors
3. Wait for "Successfully deployed"
4. Copy deployment URL: https://xxx-xxx-xxxxxx.up.railway.app
```

### **Step 5: Test Deployment** (10 min)
```bash
# Health check
curl https://xxx-xxx-xxxxxx.up.railway.app/api/v1/health

# Expected response:
# {"ok":true,"timestamp":"2026-03-28T...","uptime":"..."}

# If you get error, check logs in Railway dashboard
```

### **Step 6: Configure Custom Domain** (15 min)
```
In Railway Dashboard:
1. Go to Settings
2. Click "Add Custom Domain"
3. Railway provides CNAME record
4. Go to domain registrar (Namecheap/GoDaddy)
5. Add CNAME record:
   - Subdomain: synthmed (or blank for root)
   - Points to: railway.app (provided)
6. Wait 5-10 minutes for DNS propagation
7. Test: curl https://synthmed.ca/api/v1/health
```

### **Step 7: Enable HTTPS** (Automatic)
- Railway auto-enables HTTPS via Let's Encrypt
- Auto-renews certificates
- Free, no configuration needed

---

## 🧪 POST-DEPLOYMENT TESTING

### **Test 1: API Health** (1 min)
```bash
curl https://synthmed.ca/api/v1/health

# Expected: 200 OK
# Response: {"ok":true,"timestamp":"...","uptime":"..."}
```

### **Test 2: User Registration** (2 min)
```bash
curl -X POST https://synthmed.ca/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!@#"
  }'

# Expected: 201 Created
# Response: {
#   "ok": true,
#   "user": {
#     "id": "...",
#     "email": "test@example.com",
#     "tier": "free"
#   },
#   "accessToken": "eyJ...",
#   "refreshToken": "eyJ..."
# }
```

### **Test 3: User Login** (2 min)
```bash
curl -X POST https://synthmed.ca/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!@#"
  }'

# Expected: 200 OK
# Response: {accessToken, refreshToken, user}
```

### **Test 4: Generate Synthetic Data** (2 min)
```bash
# First, login to get token
TOKEN=$(curl -s -X POST https://synthmed.ca/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!@#"}' \
  | jq -r '.accessToken')

# Then generate data
curl -X POST https://synthmed.ca/api/v1/generate/batch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "condition": "diabetes",
    "count": 1,
    "gender": "all",
    "ageRange": "all"
  }'

# Expected: 200 OK
# Response: {
#   "ok": true,
#   "records": [{patient_data}],
#   "cost": {"cents": 0, "currency": "USD"}
# }
```

### **Test 5: Lead Capture** (2 min)
```bash
curl -X POST https://synthmed.ca/api/v1/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "organization": "Acme Corp",
    "role": "CTO",
    "message": "Interested in SynthMed"
  }'

# Expected: 201 Created
# Response: {
#   "ok": true,
#   "leadId": 123,
#   "message": "Lead captured"
# }
```

### **Test 6: Rate Limiting** (3 min)
```bash
# Send 6 requests to /leads (limit is 5/hour)
for i in {1..6}; do
  curl -X POST https://synthmed.ca/api/v1/leads \
    -H "Content-Type: application/json" \
    -d '{"name":"Test","email":"test'$i'@example.com","organization":"Test","role":"Test","message":"Test"}' \
    -w "Request $i: %{http_code}\n"
  sleep 1
done

# Expected:
# Request 1-5: 201 Created
# Request 6: 429 Too Many Requests (rate limited)
```

### **Test 7: Admin Dashboard** (3 min)
```
1. Go to https://synthmed.ca/admin.html
2. Get ADMIN_KEY from environment (for testing)
3. Paste into "Admin Key" field
4. Click "Load Leads"
5. Should see leads you submitted in Test 5
6. Try updating lead status
```

### **Test 8: Landing Page** (3 min)
```
1. Go to https://synthmed.ca
2. See marketing page
3. Click "Try Free Demo"
4. Register new account
5. Login
6. Generate patient record
7. Download as CSV/JSON
8. See it works end-to-end
```

---

## 📊 WHAT WORKS NOW (After Deployment)

✅ **Authentication**
- Email/password registration
- Login with JWT tokens
- Refresh tokens (30-day)
- Access tokens (1-hour)

✅ **API Endpoints** (12+)
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- POST /api/v1/generate/batch
- POST /api/v1/leads
- GET /api/v1/health
- DELETE /api/v1/account
- More...

✅ **Database**
- 6 tables working
- Transactions for atomicity
- Audit logging
- Usage tracking

✅ **Security**
- 11 CRITICAL fixes applied
- Rate limiting (6 levels)
- Input validation
- Password hashing (bcrypt)
- CORS configured
- HTTPS enabled

✅ **Frontend**
- Landing page (marketing)
- Registration form
- Login form
- Demo generation
- Admin dashboard
- CSV export

---

## 🔄 WHAT CAN BE IMPROVED (Post-Testing)

### **Phase 1: Minor Improvements (Low Priority)**
```
After 1-2 weeks of testing:

1. Email Notifications
   - Send confirmation email on lead capture
   - Send receipt email on data generation
   - Requires: Gmail app password setup

2. Better Error Messages
   - More specific error codes
   - Better user-facing messages
   - Requires: Frontend update

3. API Rate Limit Headers
   - Show remaining requests
   - Show reset time
   - Requires: Add headers to responses

4. Usage Dashboard
   - Show current month usage
   - Show cost breakdown
   - Requires: New API endpoint + frontend
```

### **Phase 2: Major Features (Medium Priority)**
```
After 1 month of testing:

1. Payment Integration
   - Stripe/Paddle integration
   - Automatic billing
   - Invoice generation
   - Requires: Payment processor setup

2. API Key Management UI
   - Create/revoke keys in dashboard
   - View key usage
   - Rotate keys
   - Requires: New endpoints + frontend

3. Advanced Filtering
   - Filter data by age, gender, conditions
   - Export filtered results
   - Requires: Algorithm enhancement

4. Webhook Support
   - Send data via webhook
   - Real-time notifications
   - Requires: New infrastructure
```

### **Phase 3: Architecture Changes (High Priority)**
```
After 2-3 months (based on testing feedback):

1. Migrate to Supabase (Optional)
   - Real-time features
   - Simpler code
   - Better scaling
   - Requires: 3-5 day rewrite

2. Mobile App
   - iOS/Android native app
   - OR: React Native
   - Requires: Significant development

3. Advanced Analytics
   - Usage trends
   - Customer insights
   - Requires: Analytics service

4. Custom Data Generation
   - Let users define custom fields
   - Custom algorithms
   - Requires: Complex UI + backend
```

---

## 🐛 COMMON ISSUES & FIXES

### **Issue 1: 404 - Cannot find module**
```
Cause: Missing package installation
Fix: npm install in Railway before deploying
Check: Ensure package-lock.json is committed
```

### **Issue 2: 500 - JWT_SECRET not set**
```
Cause: Environment variable not configured
Fix: Add JWT_SECRET to Railway variables
Check: Verify 32+ characters
```

### **Issue 3: CORS Error**
```
Cause: Frontend domain not in ALLOWED_ORIGINS
Fix: Add your domain to ALLOWED_ORIGINS
Example: https://synthmed.ca,https://api.synthmed.ca
```

### **Issue 4: Email Not Sending**
```
Cause: MAIL_PASS incorrect
Fix: Use Gmail app password (not regular password)
Steps:
  1. Go to myaccount.google.com/apppasswords
  2. Create app-specific password
  3. Add to MAIL_PASS variable
```

### **Issue 5: Rate Limiting Not Working**
```
Cause: Memory leak from previous version
Fix: Restart server in Railway dashboard
Check: Logs should show cleanup every 5 min
```

---

## 📈 MONITORING (After Deployment)

### **Daily Checks (First Week)**
```
1. Check error logs in Railway dashboard
2. Test API endpoints
3. Verify no memory leaks
4. Check HTTPS certificate
5. Monitor CPU/memory usage
```

### **Weekly Checks**
```
1. Review usage stats
2. Check for failed requests
3. Verify backups working
4. Review audit logs
5. Check security
```

### **Monthly Checks**
```
1. Review user feedback
2. Analyze usage patterns
3. Check performance metrics
4. Plan improvements
5. Update documentation
```

---

## 💡 DECISION TREE: What to Do After Testing

```
                    ┌─ DEPLOYMENT SUCCESSFUL ─┐
                    │                          │
        ┌───────────┴──────────┬──────────────┴────────────┐
        │                      │                           │
    (1-2 weeks)          (2-4 weeks)                  (1-3 months)
        │                      │                           │
    STABLE?              ADD FEATURES?              SCALE UP?
        │                      │                           │
    YES ↓                  YES ↓                       YES ↓
        │                      │                           │
    ┌─────────────────────────────────────────────────────────┐
    │ Phase 1: Polish                                         │
    │ • Email notifications                                   │
    │ • Better error messages                                 │
    │ • API rate limit headers                               │
    │ • Usage dashboard                                       │
    └─────────────────────────────────────────────────────────┘
                            │
                        After testing
                            │
                            ↓
    ┌─────────────────────────────────────────────────────────┐
    │ Phase 2: Monetization                                   │
    │ • Add Stripe/Paddle                                     │
    │ • Enable paid tiers                                     │
    │ • API key management UI                                 │
    │ • Webhook support                                       │
    └─────────────────────────────────────────────────────────┘
                            │
                        After users sign up
                            │
                            ↓
    ┌─────────────────────────────────────────────────────────┐
    │ Phase 3: Architecture (Optional)                        │
    │ • Migrate to Supabase (if needed)                       │
    │ • Mobile app                                            │
    │ • Advanced analytics                                    │
    │ • Custom data generation                                │
    └─────────────────────────────────────────────────────────┘
```

---

## ✅ DEPLOYMENT READINESS CHECKLIST

Before clicking "Deploy" on Railway:

**Code:**
- [ ] All changes committed
- [ ] No uncommitted files
- [ ] Latest version of feature/revenue-system-setup

**Secrets:**
- [ ] JWT_SECRET generated (32+ chars)
- [ ] ADMIN_KEY generated (32+ chars)
- [ ] Saved in secure location
- [ ] Ready to add to Railway

**Configuration:**
- [ ] ALLOWED_ORIGINS defined
- [ ] MAIL credentials ready (optional)
- [ ] NODE_ENV=production
- [ ] LOG_LEVEL=info

**Testing:**
- [ ] npm install runs successfully
- [ ] npm start works locally
- [ ] All 8 tests pass locally
- [ ] No errors in console

**Domain:**
- [ ] synthmed.ca registered (or yourdomain.com)
- [ ] Domain registrar credentials ready
- [ ] DNS access available
- [ ] CNAME record ready to add

---

## 🎯 NEXT IMMEDIATE STEPS

1. **Generate secrets** (5 min)
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Create Railway account** (5 min)
   - Go to railway.app
   - Sign up with GitHub

3. **Deploy** (20 min total)
   - Create new project
   - Connect GitHub repo
   - Add environment variables
   - Click Deploy
   - Wait for success

4. **Test** (10 min)
   - Run 8 tests above
   - Verify everything works
   - Check logs for errors

5. **Configure domain** (15 min)
   - Add CNAME record
   - Test https://yourdomain.com
   - Verify HTTPS works

**Total time to live: ~55 minutes**

---

## 📞 SUPPORT DURING DEPLOYMENT

**If you encounter errors:**

1. Check Railway logs first
2. Look for specific error message
3. Search for error in troubleshooting section above
4. If still stuck, check:
   - Environment variables (often the issue)
   - Network connectivity
   - GitHub repo access
   - API keys validity

**Common fixes:**
- Restart deployment in Railway
- Check environment variables
- Verify secrets are 32+ characters
- Check internet connection
- Clear browser cache

---

**Ready to deploy?** 🚀

Follow the steps above and reply with any questions!

