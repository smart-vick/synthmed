# Railway Deployment Guide - SynthMed

**Estimated Time:** 15-30 minutes | **Cost:** Free tier available | **Difficulty:** Easy

---

## Step 1: Prepare Secrets (5 minutes)

Generate two secure random strings for JWT and Admin key:

```bash
# Run this in your terminal (you need Node.js installed)
node -e "console.log('JWT_SECRET:', require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('ADMIN_KEY:', require('crypto').randomBytes(32).toString('hex'))"
```

**Save these values** - you'll need them in Railway.

Example output:
```
JWT_SECRET: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
ADMIN_KEY: x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2
```

---

## Step 2: Set Up Railway Account (3 minutes)

1. Go to **https://railway.app**
2. Click **"Sign Up"**
3. Choose: **"Sign up with GitHub"** (recommended)
4. Authorize Railway to access your GitHub account
5. Done! You're logged in

---

## Step 3: Create New Project (2 minutes)

1. Click **"+ New Project"** (top-left or center)
2. Select **"GitHub Repo"**
3. Search for **"synthmed"** (or your repo name)
4. Click on **smart-vick/synthmed**
5. Select branch: **claude/install-everything-claude-plugin-6NYW2**
6. Click **"Create"**

Railway will now auto-detect your Node.js app.

---

## Step 4: Configure Environment Variables (5 minutes)

Once Railway creates the project:

1. You should see a **"synthmed"** service in the dashboard
2. Click on **"synthmed"** (the service)
3. Go to **"Variables"** tab (left sidebar)
4. Click **"+ Add Variable"** and add these:

| Variable | Value | Notes |
|----------|-------|-------|
| `JWT_SECRET` | Paste from Step 1 | 32+ chars, random |
| `ADMIN_KEY` | Paste from Step 1 | 32+ chars, random |
| `NODE_ENV` | `production` | Critical for security |
| `PORT` | `3000` | Default, Railway sets this |
| `ALLOWED_ORIGINS` | See below | Update with your domain |

### For `ALLOWED_ORIGINS`:
After Railway gives you a URL (Step 6), use that:
```
https://synthmed-production.up.railway.app
```

5. Click **"Save Variables"** after each addition

---

## Step 5: Deploy (5 minutes)

1. Railway automatically deploys when you:
   - Push to GitHub, OR
   - Click the **"Deploy"** button manually

2. Go to **"Deployments"** tab
3. You should see a deployment in progress
4. Wait for **"Status: Success"** (takes 2-5 minutes)
5. Once deployed, Railway gives you a **live URL**

Copy the URL (looks like: `https://synthmed-production.up.railway.app`)

---

## Step 6: Test Live Deployment (5 minutes)

Once deployment is complete, test your API:

### Test 1: Health Check
```bash
curl https://synthmed-production.up.railway.app/api/health
```

Should return:
```json
{
  "ok": true,
  "service": "synthmed-api",
  "version": "v1",
  "database": "healthy"
}
```

### Test 2: Register User
```bash
curl -X POST https://synthmed-production.up.railway.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "organization": "Test Company",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!"
  }'
```

Should return:
```json
{
  "ok": true,
  "message": "Account created successfully",
  "account": {
    "id": 1,
    "email": "test@example.com",
    "tier": "free"
  }
}
```

### Test 3: Login
```bash
curl -X POST https://synthmed-production.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

Should return JWT tokens.

---

## Step 7: Configure Custom Domain (Optional, 5 minutes)

If you have a domain (like `synthmed.yourdomain.com`):

1. In Railway dashboard, click **"synthmed"** service
2. Go to **"Settings"** tab
3. Scroll to **"Domains"**
4. Click **"+ Add Domain"**
5. Enter your domain: `synthmed.yourdomain.com`
6. Railway gives you a **CNAME record** to add to DNS

Then update `ALLOWED_ORIGINS` with your domain.

---

## Step 8: Set Up Monitoring (2 minutes)

1. Click **"synthmed"** service
2. Go to **"Logs"** tab - watch real-time logs
3. Click **"Metrics"** tab - see CPU, memory, etc.

---

## 🎉 You're Live!

Your API is now running on Railway:
- **Base URL:** `https://synthmed-production.up.railway.app`
- **Health:** `/api/health`
- **Auth:** `/api/v1/auth/*`
- **API Keys:** `/api/v1/api-keys`
- **Data Generation:** `/api/v1/generate/*`
- **Pricing:** `/api/v1/pricing`
- **Admin:** `/api/v1/admin/*`

---

## Next Steps

### Enable Payments (30 minutes)
To accept payments, you need Stripe:

1. Create account at **stripe.com**
2. Create test products and get API keys
3. Add to Railway variables:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRODUCT_STARTER`
   - `STRIPE_PRICE_STARTER`
   - (and Pro equivalents)
4. Update webhook URL in Stripe: `{your-url}/webhooks/stripe`

### Set Up Email Notifications (15 minutes)
For lead capture emails:

1. Get Gmail app password
2. Add to Railway variables:
   - `MAIL_USER=your-email@gmail.com`
   - `MAIL_PASS=your-app-password`

### Create Landing Page
Use the HTML files in your repo:
- `index.html` - Landing & lead capture
- `admin.html` - Admin dashboard

---

## Troubleshooting

### Deployment Failed
1. Check **Logs** tab for error messages
2. Common issues:
   - Missing `package.json` (check repo root)
   - Node version mismatch (Railway auto-selects, usually fine)
   - Missing environment variables

### API Returns 500 Error
1. Check **Logs** tab
2. Likely issues:
   - `JWT_SECRET` or `ADMIN_KEY` missing/too short
   - Database connection issue
3. Add missing variables and redeploy

### Database Not Found
Railway uses ephemeral storage by default (lost on restart).

To use persistent database:
1. Add **PostgreSQL plugin** in Railway
2. Update `DATABASE_URL` connection string
3. Run migrations if needed

For now, SQLite works fine (data persists within the container).

### Logs Say "Port 3000 Already in Use"
Railway auto-assigns ports. Just redeploy.

---

## Monitoring & Maintenance

### Weekly
- Check Logs for errors
- Monitor Metrics (CPU, memory)
- Review audit logs

### Monthly
- Backup database if using PostgreSQL
- Review API usage statistics
- Check for failed payments (if using Stripe)

### Quarterly
- Update dependencies: `npm update`
- Review and update security headers
- Analyze usage patterns

---

## Cost Estimation

| Component | Free Tier | Pro Tier |
|-----------|-----------|----------|
| Railway App | $5/month | Pay-as-you-go |
| SQLite Database | Included | Included |
| Bandwidth | 10GB/month | $0.10/GB |
| Storage | 100MB | $0.10/GB/month |
| **Total/month** | **Free** | **~$15-30** |

For a small to medium B2B app, Railway's free tier handles 1000s of API calls easily.

---

## Support

- **Railway Docs:** https://docs.railway.app
- **Railway Community:** Discord (via Railway dashboard)
- **Node.js Issues:** Check server.js error logs
- **Stripe Issues:** Stripe documentation

---

## Security Checklist

✅ JWT_SECRET is random, 32+ characters
✅ ADMIN_KEY is random, 32+ characters
✅ NODE_ENV is set to `production`
✅ ALLOWED_ORIGINS updated with your domain
✅ HTTPS is enforced (Railway provides SSL)
✅ Rate limiting is active
✅ Database is initialized

**Your API is secure and ready for production use!**

---

**Next:** Once deployed, test the full registration → login → API key → data generation flow to ensure everything works end-to-end.
