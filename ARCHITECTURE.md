# SYNTHMED - SYSTEM ARCHITECTURE DOCUMENT
**Version:** 1.0
**Date:** April 1, 2026
**Status:** PRODUCTION
**Author:** Senior Architect
**Audience:** Engineers, DevOps, Technical Leadership

---

## 1. ARCHITECTURE OVERVIEW

### High-Level System Diagram
```
┌────────────────────────────────────────────────────────────────────┐
│                        CUSTOMER LAYER                              │
│  Landing Page → Pricing → Dashboard → API Integration              │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                             │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Rate Limiting │ Auth (JWT/Key) │ Quota Validation │ Logging │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                            │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Data Generation │ Payment Processing │ Usage Tracking       │ │
│  │ Authentication  │ Account Management │ Audit Logging        │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│                    DATA ACCESS LAYER (db.js)                       │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Supabase JavaScript Client (@supabase/supabase-js)          │ │
│  │ - Connection pooling                                        │ │
│  │ - Parameterized queries (SQL injection prevention)          │ │
│  │ - Real-time subscriptions                                   │ │
│  │ - Built-in authentication                                   │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER                               │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Supabase PostgreSQL (https://koreeokbppxvbecvoool.su...)    │ │
│  │ - 6 core tables (accounts, api_keys, usage_events, etc)    │ │
│  │ - Indexes for performance                                   │ │
│  │ - Row-level security (RLS) policies                         │ │
│  │ - Encrypted backups, daily snapshots                        │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
            ↓                          ↓                     ↓
    ┌─────────────┐         ┌──────────────────┐      ┌──────────┐
    │   Stripe    │         │    SendGrid      │      │  Sentry  │
    │  (Payments) │         │    (Email)       │      │(Logging) │
    └─────────────┘         └──────────────────┘      └──────────┘
```

---

## 2. TECHNOLOGY STACK

### Frontend (Customer-Facing)
```
Framework:     React 18.x (or Vue 3 for lite option)
Bundler:       Vite (fast HMR, optimal build)
State:         React Context API + custom hooks
HTTP Client:   Fetch API + axios wrapper
Styling:       CSS Modules + Tailwind (or CSS-in-JS)
Deployment:    Netlify / Vercel (separate from API)
```

### Backend API
```
Runtime:       Node.js 22.x (LTS)
Framework:     Express.js 4.x
Language:      JavaScript (ES2022+)
Pattern:       async/await (no callbacks)
Database ORM:  Supabase JavaScript Client

Key Dependencies:
├── @supabase/supabase-js    // DB + auth
├── express                   // Web framework
├── cors                       // Cross-origin
├── helmet                     // Security headers
├── jsonwebtoken              // JWT auth
├── bcryptjs                  // Password hashing
├── stripe                     // Payment processing
├── zod                        // Input validation
├── dotenv                     // Config management
└── rate-limiter-flexible     // Rate limiting
```

### Database
```
Engine:        PostgreSQL 15.x (Supabase)
Connection:    Supabase JavaScript Client (pooling built-in)
Backups:       Automatic daily (Supabase managed)
Replication:   Daily automated backup to external storage
Encryption:    AES-256 at rest, TLS in transit
Compliance:    PIPEDA-ready (no personal data stored)
```

### Deployment
```
Hosting:       Render.com (Node.js container)
Region:        Auto-scaling, North America
CI/CD:         GitHub Actions (on git push)
Monitoring:    UptimeRobot (health checks every 5min)
Error Tracking: Sentry (optional, for scaling)
```

### External Services
```
Payment:       Stripe (PCI-DSS compliant)
Email:         SendGrid (free tier 100/day, paid for scale)
Domain:        synthmed.onrender.com (custom domain optional)
DNS:           Route 53 / Cloudflare (optional CDN)
```

---

## 3. DATABASE SCHEMA

### Table: accounts
```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  organization VARCHAR(255),
  tier VARCHAR(50) DEFAULT 'free', -- free, growth, pro, enterprise
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  monthly_quota INT,  -- 100, 5000, 50000, unlimited
  monthly_usage INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active', -- active, suspended, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

CREATE INDEX idx_accounts_email ON accounts(email);
CREATE INDEX idx_accounts_stripe_customer ON accounts(stripe_customer_id);
CREATE INDEX idx_accounts_status ON accounts(status);
```

### Table: api_keys
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_account ON api_keys(account_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
```

### Table: usage_events
```sql
CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  endpoint VARCHAR(255),  -- /data/generate, etc
  api_call_cost_cents INT,  -- 1 = $0.01
  response_code INT,  -- 200, 400, 429, 500, etc
  latency_ms INT,
  ip_address INET,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Critical for dashboard performance
CREATE INDEX idx_usage_account_time ON usage_events(account_id, timestamp DESC);
CREATE INDEX idx_usage_date_trunc ON usage_events(
  account_id,
  DATE_TRUNC('hour', timestamp)
);
```

### Table: billing_cycles
```sql
CREATE TABLE billing_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  cycle_start DATE NOT NULL,
  cycle_end DATE NOT NULL,
  calls_used INT DEFAULT 0,
  cost_cents INT DEFAULT 0,
  stripe_invoice_id VARCHAR(255),
  status VARCHAR(50), -- pending, paid, failed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_billing_account_cycle ON billing_cycles(account_id, cycle_start DESC);
```

### Table: audit_logs
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  action VARCHAR(255), -- signup, login, payment, api_call, etc
  resource_type VARCHAR(100), -- account, api_key, etc
  resource_id VARCHAR(255),
  details JSONB,
  ip_address INET,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_account ON audit_logs(account_id, timestamp DESC);
```

### Table: leads
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  contact_name VARCHAR(255),
  phone VARCHAR(20),
  status VARCHAR(50), -- new, contacted, interested, trial, customer, lost
  source VARCHAR(100), -- email, twitter, referral, inbound, etc
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_status ON leads(status);
```

---

## 4. API STRUCTURE

### Request/Response Pattern
```
All endpoints return consistent JSON structure:

Success (200):
{
  "ok": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-04-01T12:00:00Z",
    "request_id": "req_abc123"
  }
}

Error (4xx/5xx):
{
  "ok": false,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "User-friendly message, not technical",
    "details": {}
  },
  "meta": {
    "timestamp": "2026-04-01T12:00:00Z",
    "request_id": "req_abc123"
  }
}
```

### Authentication Flows

#### Flow 1: JWT (Web/SPA)
```
1. POST /api/v1/auth/register
   → Returns: { accessToken, refreshToken, user }

2. Store tokens in secure HTTP-only cookies

3. Include in Authorization header:
   GET /api/v1/account
   Headers: Authorization: Bearer {accessToken}

4. If expired, POST /api/v1/auth/refresh → new accessToken
```

#### Flow 2: API Keys (Service-to-Service)
```
1. User generates key in dashboard
   → Returns one-time readable key (display only)

2. Client stores key securely

3. API call with key:
   POST /api/v1/data/generate
   Headers: Authorization: Bearer {API_KEY}

4. Server looks up key, validates, executes
```

### Core Endpoints

#### Authentication
```
POST   /api/v1/auth/register       Register new account
POST   /api/v1/auth/login          Login (returns JWT)
POST   /api/v1/auth/refresh        Refresh access token
POST   /api/v1/auth/logout         Logout (clear session)
POST   /api/v1/auth/verify-email   Verify email address
```

#### Data Generation (CORE)
```
POST   /api/v1/data/generate       Generate synthetic records
GET    /api/v1/data/preview        Preview without counting quota
```

#### Account Management
```
GET    /api/v1/account             Get account info
PUT    /api/v1/account             Update account settings
DELETE /api/v1/account             Delete account (with data)
```

#### Usage & Billing
```
GET    /api/v1/usage               Get current month usage
GET    /api/v1/usage/history       Get usage by day/hour
GET    /api/v1/billing/invoices    List paid invoices
POST   /api/v1/billing/checkout    Create Stripe checkout session
GET    /api/v1/billing/portal      Redirect to Stripe portal
```

#### API Keys
```
GET    /api/v1/keys                List user's API keys
POST   /api/v1/keys                Create new API key
DELETE /api/v1/keys/:id            Revoke API key
PUT    /api/v1/keys/:id            Update key name/permissions
```

#### Admin (Internal)
```
GET    /api/v1/admin/metrics       Revenue, customer, usage metrics
GET    /api/v1/admin/leads         List sales leads
POST   /api/v1/admin/leads         Create/update lead
```

---

## 5. SECURITY ARCHITECTURE

### Authentication & Authorization

#### Password Security
```javascript
// Registration
const passwordHash = await bcryptjs.hash(password, 12);
// Stored in DB, never logged, never returned

// Login
const isValid = await bcryptjs.compare(password, passwordHash);
// Timing-attack resistant comparison
```

#### JWT Security
```
Access Token:
- Expires in: 1 hour (short-lived)
- Payload: { sub: user_id, email, tier }
- Signed with: HS256 (JWT_SECRET env var)
- Stored in: HttpOnly cookie (XSS protection)

Refresh Token:
- Expires in: 30 days (long-lived)
- Stored in: Secure, SameSite cookie
- Can be revoked server-side
```

#### API Key Security
```javascript
// Generation
const apiKey = crypto.randomBytes(32).toString('hex');
const keyHash = await bcryptjs.hash(apiKey, 12);
// Store only hash in database

// Validation
const keyHash = await bcryptjs.hash(providedKey, 12);
const account = await db.getAccountByApiKey(keyHash);
```

### Network Security
```
HTTPS/TLS:
- Enforce HTTPS only (redirect HTTP → HTTPS)
- HSTS header (Strict-Transport-Security)
- TLS 1.2+ only

CORS:
- Whitelist: https://synthmed.com, https://app.synthmed.com
- Methods: GET, POST, PUT, DELETE
- Credentials: Allow only same-origin

Headers (Helmet):
- Content-Security-Policy (no eval, no inline scripts)
- X-Frame-Options: DENY (clickjacking protection)
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
```

### Data Protection
```
At Rest:
- Database: AES-256 encryption (Supabase managed)
- Backups: Encrypted, stored geographically diverse
- Secrets: Environment variables only, never in code

In Transit:
- All traffic: TLS 1.2+ only
- Stripe: PCI-DSS compliant
- Supabase: TLS encrypted connections

Logging:
- Never log: Passwords, API keys, tokens, payment data
- Do log: User ID, action, timestamp, result code
- Retention: 30 days (for audit), then delete
```

### Rate Limiting
```
Per-Tier Limits:
- Free:       100 calls/month, 5 calls/minute
- Growth:    5000 calls/month, 50 calls/minute
- Pro:      50000 calls/month, 500 calls/minute
- Enterprise: unlimited

Auth Endpoints (strict):
- /auth/login: 5 attempts per 15 minutes
- /auth/register: 3 per hour per IP

General:
- Implementation: in-memory Map (switch to Redis at scale)
- Enforcement: 429 Too Many Requests
- Headers: RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
```

### Compliance & Audit
```
PIPEDA Compliance:
- ✅ No real patient data stored
- ✅ Synthetic data only
- ✅ Privacy policy on site
- ✅ Terms of Service on site
- ✅ Data retention policy documented

Audit Trail:
- Every meaningful action logged
- Tables: accounts (login), api_keys (generation), usage_events
- Retention: 90 days
- Access: Admin dashboard only
```

---

## 6. DEPLOYMENT ARCHITECTURE

### Production Environment (Render)
```
┌─────────────────────────────────────┐
│   Render Container (Node.js)        │
│  ┌───────────────────────────────┐ │
│  │  App Instance (port 3000)     │ │
│  │  - Auto-restart on crash      │ │
│  │  - Health check every 10s     │ │
│  │  - Can scale to 2+ instances  │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
         ↓
  GitHub Actions CI/CD
  (on git push to main)
  ├─ npm install
  ├─ npm lint
  ├─ npm test
  ├─ npm build
  └─ Deploy to Render
```

### Deployment Process
```bash
# 1. Developer pushes to main
git push origin main

# 2. GitHub Actions triggered
npm install
npm run lint      # ESLint
npm run test      # Jest (when added)
npm run build     # Build + optimizations (when needed)

# 3. Deploy to Render
# Render auto-deploys via git webhook
# 4. Health check confirms live
# 5. Old instance terminates (zero-downtime deploy)
```

### Environment Variables
```
Required in .env:
- DATABASE_URL=postgresql://...
- SUPABASE_URL=https://...
- SUPABASE_ANON_KEY=sb_publishable_...
- SUPABASE_SERVICE_ROLE_KEY=...
- JWT_SECRET=(random 32+ char string)
- STRIPE_SECRET_KEY=sk_...
- STRIPE_PUBLISHABLE_KEY=pk_...
- STRIPE_WEBHOOK_SECRET=whsec_...
- SENDGRID_API_KEY=SG...
- ALLOWED_ORIGINS=https://synthmed.com,https://app.synthmed.com
- NODE_ENV=production
```

---

## 7. SCALING STRATEGY

### Phase 1: Single Instance (Now → 1K customers)
```
Current setup: Single Render container
Bottleneck: In-memory rate limiting, no caching
OK for: <1K requests/second, <100 concurrent users

Action: Monitor metrics weekly
- Request latency
- Database query time
- Memory usage
```

### Phase 2: Rate Limiting → Redis (1K → 5K customers)
```
Add: Redis cache (Render managed)
Replace: In-memory rate limiting with Redis
Benefit: Rate limits work across multiple instances
Cost: ~$10-20/month for Redis

When: When you see "rate limit inconsistency across instances"
```

### Phase 3: Caching Layer (5K → 10K customers)
```
Add: Redis caching for:
- Account info (5 min TTL)
- API key validation (1 hour TTL)
- Usage aggregates (hourly TTL)

Benefit: Reduce database queries by 70%
Cost: ~$20-50/month for larger Redis

When: Database CPU > 60%
```

### Phase 4: Database Scaling (10K+ customers)
```
Options:
1. Supabase Pro plan (for better performance)
2. Read replicas for analytics queries
3. Connection pooling via PgBouncer

When: Database response time > 100ms
```

### Phase 5: Geographic Scaling (Multi-region)
```
Add: API gateway (CloudFlare, AWS API Gateway)
Deploy: API instances in US-East, US-West, EU, APAC
Benefit: Lower latency globally
Cost: ~$500+/month

When: International customer adoption
```

---

## 8. MONITORING & OBSERVABILITY

### Health Checks
```
Endpoint: GET /api/health
Response:
{
  "ok": true,
  "service": "synthmed-api",
  "version": "v1",
  "uptime_seconds": 3600,
  "database": "healthy",
  "stripe": "connected",
  "timestamp": "2026-04-01T12:00:00Z"
}

Frequency: Every 10 seconds (Render)
Alert: If unhealthy for 5 min → page on-call
```

### Metrics Dashboard
```
Key Metrics:
- Requests/second (should be < 100 for scale)
- Average response time (target < 200ms)
- Error rate (should be < 1%)
- Database query time (target < 50ms)
- CPU/Memory utilization
- Active connections

Tools:
- Render built-in metrics (free)
- Datadog / New Relic (when scaling)
- Prometheus + Grafana (optional)
```

### Error Tracking
```
When to add Sentry:
- You have > 10K requests/day
- You want real-time error alerts
- You need stack traces + context

Setup:
1. npm install @sentry/node
2. Initialize in server.js
3. Capture errors automatically
4. Get alerts on Slack

Cost: Free tier sufficient for MVP
```

---

## 9. DATA FLOW DIAGRAMS

### Data Generation Flow
```
Customer Request:
POST /api/v1/data/generate
{
  "records": 1000,
  "conditions": ["diabetes"]
}
        ↓
Authentication:
- Validate JWT or API key
- Look up account in database
- Check tier + status
        ↓
Quota Check:
- Get account.monthly_usage
- Get account.monthly_quota
- If usage >= quota → Return 429
        ↓
Cost Calculation:
- cost = records * $0.01
        ↓
Data Generation:
- Call synthetic data function
- Generate JSON with 1000 records
        ↓
Log Usage (non-blocking):
INSERT INTO usage_events (
  account_id, endpoint, cost_cents, timestamp
)
        ↓
Update Monthly Usage:
UPDATE accounts SET monthly_usage = monthly_usage + 1000
        ↓
Return Response:
{
  "data": [...1000 records...],
  "cost_cents": 1000,
  "total_records": 1000
}
```

### Payment Flow
```
User clicks "Upgrade to Growth" on dashboard
        ↓
POST /api/v1/billing/checkout
{
  "tier": "growth"
}
        ↓
Create Stripe Session:
stripe.checkout.sessions.create({
  customer_email: user.email,
  line_items: [{
    price_data: {
      currency: 'usd',
      product_data: { name: 'Growth Tier' },
      unit_amount: 2900  // $29.00
    },
    quantity: 1
  }],
  mode: 'subscription',
  success_url: '...',
  cancel_url: '...'
})
        ↓
Redirect to Stripe Checkout
(User enters payment info)
        ↓
Stripe calls webhook:
POST /api/v1/webhooks/stripe
(charge.succeeded event)
        ↓
Server:
1. Verify webhook signature
2. Get customer email from event
3. Update accounts.tier = 'growth'
4. Update accounts.stripe_subscription_id
5. Send confirmation email
        ↓
User dashboard updates:
"You're now on Growth tier!"
```

---

## 10. APPENDIX: KEY FILES

### Core Files
```
server.js                 Main Express app (1100+ lines)
db.js                     Database abstraction (database-agnostic)
src/auth-service.js       Password hashing, JWT generation
src/auth-middleware.js    Request authentication middleware
src/payment-service.js    Stripe webhook handlers
src/validation.js         Zod schemas for all endpoints
```

### Configuration Files
```
.env                      Secrets (not in git)
.env.example             Template for .env
package.json             Dependencies + scripts
.claude/launch.json      Development server config
```

### Deployment Files
```
Procfile                 (for Heroku-compatible hosts)
render.yaml              (Render deployment config)
.github/workflows/       CI/CD pipeline
```

---

## 11. DISASTER RECOVERY

### Backup Strategy
```
Database Backups:
- Automatic: Daily snapshots (Supabase)
- Manual: Weekly backup to AWS S3
- Retention: 30 days
- RTO (Recovery Time): < 1 hour
- RPO (Recovery Point): < 24 hours

Test Recovery:
- Monthly: Restore backup to staging
- Verify: Data integrity, completeness
- Document: Any issues, learnings
```

### Incident Response
```
If API down:
1. Check Render status page (is it a platform issue?)
2. Check database connection (can Supabase reach?)
3. Check recent deployments (did something break?)
4. Rollback if necessary
5. Notify customers via status page
6. Post-mortem within 24 hours

If data corrupted:
1. Stop all writes (put app in read-only mode)
2. Restore from backup
3. Notify affected customers
4. Audit what caused corruption
5. Implement safeguards
```

---

**Document Status:** FINAL - Production Ready
**Last Updated:** April 1, 2026
**Next Review:** May 1, 2026 (after first 100 customers)
