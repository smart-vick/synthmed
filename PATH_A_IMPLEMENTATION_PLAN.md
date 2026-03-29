# Path A: Complete Enterprise Application Build Plan

**Timeline:** 1-2 weeks | **Effort:** ~40 hours | **Status:** Starting NOW

## Overview
Transform SynthMed from MVP (lead capture only) to full enterprise B2B SaaS with authentication, payments, data generation, and complete admin system.

---

## Phase 1: Foundation & Authentication (8 hours)

### 1.1 Database Schema Enhancement
**Current:** 2 tables (leads, preview_events)
**Target:** 6 tables with proper relationships

```sql
-- New tables needed:
- accounts (id, email, password_hash, organization, tier, status, created_at)
- api_keys (id, account_id, key, name, expires_at, created_at)
- usage_events (id, account_id, endpoint, records_generated, timestamp)
- audit_logs (id, account_id, action, resource, ip_address, timestamp)
- payments (id, account_id, amount, stripe_id, status, created_at)
- subscriptions (id, account_id, stripe_subscription_id, tier, current_period_end)
```

**Files to create/modify:**
- `db.js` - Add all new tables and prepared statements
- Dependencies: `better-sqlite3` (already have)

### 1.2 Authentication System
**JWT Strategy:**
- Access token: 1 hour expiry
- Refresh token: 30 days expiry
- Stored in httpOnly cookies (for web) or headers (for API)

**Files to create:**
- `src/auth-service.js` - Register, login, refresh token logic
- `src/auth-middleware.js` - JWT validation middleware
- `src/schemas.js` - Zod validation for email, password, etc.

**Endpoints to create:**
```
POST   /api/v1/auth/register      - Create account
POST   /api/v1/auth/login         - Get access + refresh tokens
POST   /api/v1/auth/refresh       - Get new access token
GET    /api/v1/account            - Get account info (requires JWT)
DELETE /api/v1/account            - Delete account (GDPR compliance)
```

**Security requirements:**
- bcryptjs for password hashing (12+ char, uppercase, lowercase, number, special char)
- Timing attack prevention (constant-time comparison)
- Input validation with Zod
- Email validation (no disposable emails)

---

## Phase 2: API Key & Rate Limiting System (6 hours)

### 2.1 API Key Management
**Files to create:**
- `src/api-key-service.js` - Key generation and rotation
- Endpoint: `POST /api/v1/api-keys` - Create API key
- Endpoint: `GET /api/v1/api-keys` - List user's API keys
- Endpoint: `DELETE /api/v1/api-keys/:id` - Revoke key

**Key format:** `sk_{32_random_characters}` (never visible again after creation)

### 2.2 Rate Limiting (6 levels)
**Files to create:**
- `src/rate-limiter.js` - Tier-based rate limiting

**Rate limits:**
```
Public endpoints:        100 req/15 min per IP
Authentication:          5 attempts/15 min per IP (skip successful)
Lead capture:            5 per hour per IP
API calls (Free tier):    100 per hour
API calls (Starter tier): 5,000 per hour ($25/mo)
API calls (Pro tier):     50,000 per hour ($125/mo)
API calls (Enterprise):   Unlimited (custom pricing)
```

---

## Phase 3: Data Generation Engine (7 hours)

### 3.1 Patient Data Generation
**Files to create:**
- `src/data-generator.js` - Clinical data synthesis

**Features:**
- 5 condition categories: cardiovascular, diabetes, respiratory, mental-health, orthopedic
- ICD-10-CA codes with appropriate medications
- Clinically coherent vitals (BP, glucose, HbA1c)
- Canadian demographics (provinces, patient IDs with SYN-CA prefix)
- PIPEDA-compliant (no real personal data)

**Endpoints:**
```
POST /api/v1/generate/preview  - Preview 1 record
POST /api/v1/generate/batch    - Generate 1-1000 records (requires API key)
```

**Formats:** JSON, CSV (with injection prevention)

**Tier-based limits:**
- Free: 1,000 records/month
- Starter: 50,000 records/month
- Pro: 500,000 records/month
- Enterprise: Custom

---

## Phase 4: Payment Integration with Stripe (8 hours)

### 4.1 Stripe Setup
**Files to create:**
- `src/payment-service.js` - Stripe API wrapper
- `src/webhook-handler.js` - Handle Stripe events

**Endpoints:**
```
POST   /api/v1/billing/checkout-session     - Create Stripe session
GET    /api/v1/billing/status               - Get subscription status
POST   /api/v1/billing/portal               - Customer portal link
POST   /webhooks/stripe                     - Stripe webhooks
```

**Products to create in Stripe:**
- Starter: $25/month → 50K records
- Pro: $125/month → 500K records
- Enterprise: Custom (contact sales)

**Features:**
- Automatic invoice generation
- Usage tracking with overage warnings
- Dunning management for failed payments
- Customer portal for self-service

---

## Phase 5: Audit Logging & Security (5 hours)

### 5.1 Audit Trail
**Files to create:**
- `src/audit-service.js` - Event logging

**Events to log:**
- LOGIN_SUCCESS, LOGIN_FAILED
- ACCOUNT_CREATED, ACCOUNT_DELETED
- API_KEY_CREATED, API_KEY_REVOKED
- DATA_GENERATED (with record count)
- PAYMENT_RECEIVED, PAYMENT_FAILED

**Database:** `audit_logs` table with IP, user agent, timestamp

### 5.2 Security Hardening
**Files to create:**
- `src/error-handler.js` - Standardized error responses
- Add Helmet.js for security headers
- Add CORS validation
- Add input validation for all endpoints

---

## Phase 6: Admin Dashboard API (5 hours)

### 6.1 Lead Management Endpoints
```
GET    /api/v1/admin/leads                  - List all leads with pagination
GET    /api/v1/admin/leads/:id              - Get lead details
PUT    /api/v1/admin/leads/:id/status       - Update lead status (new, contacted, converted, lost)
DELETE /api/v1/admin/leads/:id              - Archive lead
```

### 6.2 Analytics Endpoints
```
GET    /api/v1/admin/stats                  - Dashboard statistics
GET    /api/v1/admin/usage                  - Account usage by tier
GET    /api/v1/admin/revenue                - Monthly recurring revenue (MRR)
```

**Auth:** Admin key in `x-admin-key` header (32+ char)

---

## Phase 7: Testing & Deployment (2-3 hours)

### 7.1 Comprehensive Testing
- Unit tests for each service
- Integration tests for API endpoints
- Payment flow testing (Stripe test mode)
- Rate limiting verification
- Security validation

### 7.2 Documentation
- API reference (OpenAPI/Swagger)
- Setup guide for Stripe
- Deployment checklist
- Environment variables list

### 7.3 Production Deployment
- Railway or self-hosted VPS
- Environment variables (JWT_SECRET, STRIPE_KEY, etc.)
- SSL/TLS certificate
- Database backup strategy
- Monitoring setup

---

## Implementation Order

1. ✅ **Day 1-2:** Database + Auth System
   - Modify `db.js` with 6 tables
   - Create `src/auth-service.js`
   - Create `src/schemas.js`
   - Test registration & login

2. ✅ **Day 2:** API Keys + Rate Limiting
   - Create `src/api-key-service.js`
   - Create `src/rate-limiter.js`
   - Test key creation & enforcement

3. ✅ **Day 3-4:** Data Generation
   - Create `src/data-generator.js`
   - Create generation endpoints
   - Add CSV/JSON export
   - Test clinical coherence

4. ✅ **Day 4-5:** Stripe Integration
   - Set up Stripe account
   - Create `src/payment-service.js`
   - Create checkout & webhook endpoints
   - Test payment flows

5. ✅ **Day 5:** Audit + Admin
   - Create `src/audit-service.js`
   - Create admin endpoints
   - Add error standardization

6. ✅ **Day 6-7:** Testing + Deploy
   - Run full test suite
   - Deploy to production
   - Verify all features work live
   - Monitor for issues

---

## Success Criteria

- ✅ Users can register, login, get API keys
- ✅ Authenticated users can generate synthetic patient data
- ✅ Payment processing works (Stripe test mode)
- ✅ Rate limiting prevents abuse
- ✅ Admin can manage leads and view stats
- ✅ All endpoints documented
- ✅ Live on production with custom domain
- ✅ No security vulnerabilities

---

## Environment Variables Needed

```
# Server
PORT=3000
NODE_ENV=production

# Security
JWT_SECRET=32+ character random string
ADMIN_KEY=32+ character random string

# Database
DATABASE_URL=/path/to/db (optional, uses default)

# Email
MAIL_USER=your-email@gmail.com
MAIL_PASS=gmail-app-password

# Stripe
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# CORS
ALLOWED_ORIGINS=https://yourapp.com,https://www.yourapp.com
```

---

## Current Status

**Start Time:** Now
**Target Completion:** 1-2 weeks
**Current Phase:** 1 (Database & Auth)

Let's build this! 🚀
