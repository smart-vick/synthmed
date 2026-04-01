# SYNTHMED - PRODUCT REQUIREMENTS DOCUMENT (PRD)
**Version:** 1.0
**Date:** April 1, 2026
**Status:** LIVE - Production Ready
**Author:** Founder
**Audience:** Engineering, Product, Sales, Executive

---

## 1. EXECUTIVE SUMMARY

**Product:** SynthMed - Synthetic Patient Data Generator for Healthcare AI
**Category:** B2B SaaS / Healthcare AI Infrastructure
**Market:** Healthcare AI companies, medical researchers, health tech startups, hospital systems
**Business Model:** Subscription-based (Free, Growth $29/mo, Pro $149/mo, Enterprise custom)
**Revenue Target:** $10K MRR by end of Month 3
**Launch Date:** April 1, 2026
**Status:** LIVE with core API working, business model incomplete

---

## 2. PRODUCT VISION

### Problem Statement
Healthcare AI teams need realistic training data to build accurate models, but:
- **Real patient data** is restricted by HIPAA/PIPEDA (impossible to access)
- **Synthetic data vendors** are expensive ($500-5000/dataset), slow (weeks), inflexible
- **Building synthetic data** in-house requires healthcare expertise + data science skills
- **Privacy concerns** prevent iterating on models with real data

### Solution
SynthMed generates PIPEDA-compliant synthetic Canadian patient data in **2 minutes** via API, enabling:
- **Instant training data** for healthcare AI models
- **Privacy-compliant** data (synthetic = no real patient records)
- **Customizable** by condition, age range, medications
- **Cost-effective** ($29-149/month vs $500-2000 one-time)
- **Iteration-friendly** (generate new datasets quickly)

### Product Promise
> "Get realistic, PIPEDA-compliant synthetic patient data for your healthcare AI model in 2 minutes. No privacy headaches. No waiting weeks."

---

## 3. TARGET USERS

### Primary User Persona: Dr. Sarah Chen
**Profile:** ML Engineer at healthcare AI startup
**Problem:** Training diagnostic imaging model, needs 50K+ patient samples with varied imaging conditions
**Current Solution:** Manually requesting data from hospital (3-month wait, limited diversity)
**Pain Point:** "We have a great model but can't iterate because data acquisition is bottleneck"
**Why SynthMed:** Gets 50K synthetic records in 5 minutes, iterates model daily

### Secondary User Personas

**Researcher at Academic Hospital**
- Building predictive models for hospital readmission
- Limited budget ($50-300/month)
- Needs data quickly for thesis/publication
- Uses: Growth tier ($29/mo)

**CTO at Health Tech Startup**
- Building multiple AI features (diagnostic, triage, prognosis)
- Budget: $500+/month across team
- Needs API integration + custom data generation
- Uses: Pro tier + Enterprise custom

**Hospital System Innovation Team**
- Exploring AI initiatives, testing vendors
- Budget: $2000+/month if solving real problem
- Needs: Dedicated support, data residency, SLA
- Uses: Enterprise tier

---

## 4. CORE FEATURES (MVP - LIVE)

### 4.1 API Data Generation
**Feature:** POST /api/v1/data/generate
**Input:**
```json
{
  "records": 100-10000,
  "conditions": ["diabetes", "cancer", "hypertension"],
  "age_range": [18, 85],
  "include_medications": true,
  "include_labs": true
}
```
**Output:** 100-10000 synthetic patient records as JSON
**Performance:** <200ms response time
**Rate Limits:**
- Free: 100 calls/month
- Growth: 5,000 calls/month
- Pro: 50,000 calls/month
- Enterprise: Unlimited

### 4.2 Authentication
**Method:** JWT (1h access token, 30d refresh token)
**Also Supported:** API keys for service-to-service calls
**Security:** bcryptjs (cost 12), CORS whitelist, rate limiting
**Endpoint:** POST /api/v1/auth/register, POST /api/v1/auth/login

### 4.3 Usage Tracking
**Feature:** Real-time API call tracking
**Data Collected:** Account ID, endpoint, cost, timestamp, response code
**Access:** GET /api/v1/usage (dashboard visible)
**Aggregation:** Hourly + daily + monthly

### 4.4 Payment Integration
**Provider:** Stripe
**Modes:** Subscription (monthly) + one-time billing
**Features:**
- Secure checkout (PCI compliant)
- Invoice emailing
- Customer portal for self-service
- Automatic tier upgrades on payment
- Refund handling + downgrade on refund

### 4.5 API Key Management
**Feature:** Generate/revoke API keys for programmatic access
**Security:** Keys hashed in database, never shown in logs
**Rotation:** Support key rotation without downtime
**Endpoint:** POST /api/v1/keys, DELETE /api/v1/keys/:id

---

## 5. PLANNED FEATURES (ROADMAP)

### Phase 2: Customer Experience (Weeks 2-4)
- [ ] Customer dashboard (usage, billing, settings)
- [ ] Email verification on signup
- [ ] Transactional emails (verification, payment, password reset)
- [ ] API documentation website
- [ ] SDKs (Python, JavaScript)
- [ ] Webhook support (event notifications)

### Phase 3: Analytics & Scaling (Month 2)
- [ ] Usage analytics dashboard (granular by endpoint)
- [ ] Customer cohort analysis
- [ ] Churn prediction
- [ ] Error tracking (Sentry)
- [ ] Uptime monitoring (UptimeRobot)
- [ ] Status page

### Phase 4: Enterprise (Month 3+)
- [ ] Custom data generation (specific conditions, medications)
- [ ] Data residency (Canada/US region selection)
- [ ] Dedicated account manager
- [ ] SLA monitoring (99.95% uptime guarantee)
- [ ] Team management (multiple users per account)
- [ ] Usage-based billing (pay per API call)

---

## 6. USER STORIES

### Story 1: Quick Test
**As a** ML engineer
**I want to** generate 1000 synthetic patient records
**So that** I can test my model training pipeline

**Acceptance Criteria:**
- [ ] Signup takes < 2 minutes
- [ ] API call returns data in < 500ms
- [ ] Data format is valid JSON
- [ ] Free tier provides 100 records/month

### Story 2: Production Integration
**As a** CTO
**I want to** use an API key to integrate synthetic data generation into my training pipeline
**So that** we can automate model training without manual data requests

**Acceptance Criteria:**
- [ ] API key auth works via Authorization header
- [ ] Rate limiting respects tier limits (Pro = 50K/month)
- [ ] Errors are clear and actionable
- [ ] Webhook notifies us when quota is reached

### Story 3: Usage Visibility
**As a** billing manager
**I want to** see how much API usage my team used this month
**So that** I can forecast costs and justify budget

**Acceptance Criteria:**
- [ ] Dashboard shows real-time usage bar
- [ ] Usage breakdown by endpoint visible
- [ ] Email alerts at 80%, 95%, 100% quota
- [ ] Downloadable invoice

### Story 4: Upgrade Flow
**As a** growth tier customer
**I want to** upgrade to pro tier if I hit quota
**So that** my requests don't get blocked

**Acceptance Criteria:**
- [ ] Alert at 80% quota usage
- [ ] Upgrade button prominent on dashboard
- [ ] Stripe checkout is 1-click
- [ ] New quota active immediately after payment

---

## 7. SUCCESS METRICS

### Business Metrics
| Metric | Target | Timeline |
|--------|--------|----------|
| **MRR (Monthly Recurring Revenue)** | $10K | End of Month 3 |
| **Active Customers** | 10+ | End of Month 2 |
| **Customer Acquisition Cost (CAC)** | <$100 | Ongoing |
| **Lifetime Value (LTV)** | >$1000 | After Month 2 |
| **LTV:CAC Ratio** | >10:1 | After Month 3 |
| **Churn Rate** | <5% | After Month 2 |
| **Net Retention** | >100% | Month 3+ |

### Product Metrics
| Metric | Target | Acceptable |
|--------|--------|-----------|
| **API Response Time** | <100ms | <500ms |
| **Uptime** | 99.95% | 99.5% |
| **Error Rate** | <0.5% | <1% |
| **Data Generation Quality** | Statistically identical to real | Doctors approve quality |
| **Time to First API Call** | <5 min | <15 min |
| **Signup to Payment** | <30 min | <2 hours |

### User Adoption Metrics
| Metric | Target | Timeline |
|--------|--------|----------|
| **Signup Rate** | 50/week | By Week 4 |
| **Free to Paid Conversion** | 10% | By Week 4 |
| **Time to First API Call** | <10 min avg | Week 1 |
| **Feature Adoption** | 80% of users use generation | Week 2 |
| **NPS (Net Promoter Score)** | >50 | Month 2 |

---

## 8. PRICING STRATEGY

### Tier Definition

#### Free Tier
**Price:** $0
**Limit:** 100 API calls/month
**Features:**
- Generate synthetic records
- Email verification required
- Community support (email)
- Basic usage tracking
- No SLA

**Target:** Researchers, students, POC evaluations
**Goal:** Product awareness, conversion funnel top

#### Growth Tier
**Price:** $29/month
**Limit:** 5,000 API calls/month (~150/day)
**Features:**
- All Free features +
- Priority email support (24h response)
- API analytics (usage by endpoint)
- Custom data filters (age range, conditions)
- Webhook access
- No contract

**Target:** Startups, research labs, active development
**Goal:** Self-serve growth, product-led growth

#### Pro Tier
**Price:** $149/month
**Limit:** 50,000 API calls/month (~1,500/day)
**Features:**
- All Growth features +
- Dedicated Slack channel (on-demand)
- Advanced analytics (cohort analysis)
- Custom data generation (specific conditions)
- 99.9% uptime SLA
- Priority support (4h response)
- API key rotation
- Usage alerts + quota management

**Target:** Mid-market companies, active AI teams
**Goal:** Stickiness, upsell anchor

#### Enterprise Tier
**Price:** Custom ($2,000+/month)
**Limit:** Unlimited API calls
**Features:**
- All Pro features +
- Unlimited everything
- Custom SLA (99.95% uptime)
- Dedicated account manager
- Custom data generation pipeline
- Data residency (Canada/US)
- Security audit + compliance
- Quarterly business reviews
- Priority support (1h response)

**Target:** Hospital systems, health insurers, major AI labs
**Goal:** Revenue anchor, customer lock-in

---

## 9. GO-TO-MARKET STRATEGY

### Launch Phase (Week 1)
- [ ] Deploy landing page with pricing
- [ ] Publish API documentation
- [ ] Create legal docs (Privacy Policy, ToS)
- [ ] Setup support email
- [ ] Twitter announcement

### Early Adoption Phase (Weeks 2-3)
- [ ] Email 50 qualified leads (healthcare AI companies, research labs)
- [ ] Cold call top 20 targets
- [ ] Schedule 5-10 demo calls
- [ ] Close first 1-2 customers
- [ ] Get testimonials/case studies

### Growth Phase (Weeks 4-8)
- [ ] Launch referral program
- [ ] Build customer dashboard
- [ ] Add SDKs (Python, JavaScript)
- [ ] Write blog posts / documentation
- [ ] Target 10+ customers total
- [ ] Aim for $5K+ MRR

### Scale Phase (Month 3+)
- [ ] Enterprise sales outreach
- [ ] Custom implementation for large deals
- [ ] Community building (open source? GitHub discussions?)
- [ ] Press mentions / industry blogs
- [ ] Target $10K+ MRR

---

## 10. COMPETITIVE ANALYSIS

| Factor | SynthMed | Vendor A | Vendor B | Vendor C |
|--------|----------|----------|----------|----------|
| **Speed** | 2 min | 2 weeks | 1 week | Same day |
| **Cost** | $29-149/mo | $500-2000 one-time | $200-500/mo | $300-1000/mo |
| **Privacy** | ✅ Synthetic | ⚠️ Real + de-identified | ✅ Synthetic | ✅ Synthetic |
| **Customization** | ✅ Full | ⚠️ Limited | ✅ Full | ⚠️ Limited |
| **API** | ✅ Yes | ❌ CSV only | ⚠️ Limited | ✅ Yes |
| **PIPEDA Compliance** | ✅ Yes | ❌ Not mentioned | ✅ Yes | ✅ Yes |
| **Support** | Email | Dedicated account manager | Email + chat | Limited |

**SynthMed Advantage:** Speed + Price + API-first + Canadian focus

---

## 11. RISKS & MITIGATIONS

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| **Data quality not good enough** | High | Medium | Hire healthcare data scientist to validate; user testing early |
| **Market too small** | High | Low | Target adjacent markets (pharma, insurance, genomics) |
| **Stripe integration fails** | Medium | Low | Implement fallback payment method; test thoroughly |
| **Competitors undercut on price** | Medium | High | Build switching costs (integrations, support, custom features) |
| **Supabase goes down** | High | Very Low | Backup to AWS RDS; cross-region replication |
| **Legal liability (data privacy)** | High | Medium | Consult healthcare lawyer; strong ToS + Privacy Policy |
| **Slow API adoption** | Medium | Medium | Build SDKs early; publish examples; developer education |

---

## 12. DEFINITION OF DONE

### For MVP (Current - LIVE)
- [x] API endpoints working (12+ endpoints)
- [x] Database healthy (Supabase PostgreSQL)
- [x] Payment processing (Stripe checkout)
- [x] Authentication (JWT + API keys)
- [x] Rate limiting (tier-aware)
- [x] Error handling (no stack traces in production)
- [x] Health check endpoint
- [x] Deployment to production (Render)
- [ ] API documentation
- [ ] Landing page with pricing
- [ ] Email verification
- [ ] Privacy policy + ToS
- [ ] Support email

### For Beta (Week 2-3)
- [ ] Customer dashboard
- [ ] Email notifications
- [ ] SDKs (Python, JavaScript)
- [ ] Webhook support
- [ ] Usage analytics
- [ ] First 5 paying customers
- [ ] Case studies / testimonials

### For Production (Month 2+)
- [ ] Enterprise support
- [ ] Custom data generation
- [ ] Data residency
- [ ] SLA monitoring
- [ ] Team management
- [ ] Advanced analytics
- [ ] 10+ paying customers
- [ ] $10K+ MRR

---

## 13. APPENDIX: API SPECIFICATION

### Endpoint: Generate Data
```
POST /api/v1/data/generate
Authorization: Bearer {JWT_TOKEN} or API-Key: {API_KEY}

Request:
{
  "records": 1000,
  "conditions": ["diabetes", "hypertension"],
  "age_range": [18, 85],
  "include_medications": true,
  "include_labs": true,
  "format": "json"
}

Response (200):
{
  "data": [
    {
      "id": "patient_123",
      "age": 42,
      "gender": "M",
      "conditions": ["diabetes"],
      "medications": ["metformin"],
      "labs": {
        "glucose": 145,
        "HbA1c": 7.2
      }
    }
  ],
  "total_records": 1000,
  "cost_cents": 1000,
  "generated_at": "2026-04-01T12:00:00Z"
}

Response (429 - Quota Exceeded):
{
  "error": "Quota exceeded",
  "used": 5000,
  "limit": 5000,
  "reset_at": "2026-05-01T00:00:00Z",
  "upgrade_url": "https://synthmed.com/upgrade"
}
```

---

**Document Status:** FINAL - Ready for Implementation
**Last Updated:** April 1, 2026
**Next Review:** April 15, 2026
