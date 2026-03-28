# 📁 SynthMed File Structure Guide

## **QUICK NAVIGATION**

```
/home/user/synthmed/
├── 🚀 CORE APPLICATION
├── 📚 DOCUMENTATION
├── 🎨 FRONTEND
├── 🔧 CONFIGURATION
├── 📊 BUSINESS DOCS
└── 🛠️ TOOLS & PLUGINS
```

---

## **🚀 CORE APPLICATION FILES**

### **Main Server**
```
server-new.js (23.9 KB)
├─ Main Express application
├─ All 12 API endpoints
├─ Static file serving (HTML/CSS)
├─ Security middleware (helmet, CORS)
├─ Error handling
└─ Route definitions

Status: ✅ PRODUCTION READY
Used: Yes (replace server.js with this)
```

### **Database**
```
db.js (6 KB)
├─ SQLite database setup
├─ All table schemas
├─ Prepared statements
├─ Database operations
└─ Index definitions

Tables:
- leads (lead capture)
- accounts (user accounts)
- api_keys (API key management)
- usage_events (billing tracking)
- audit_logs (compliance logging)
- preview_events (demo tracking)

Status: ✅ READY
Database file: synthmed.db (65 KB)
```

### **Email Service**
```
mailer.js (2.2 KB)
├─ Nodemailer configuration
├─ Email templates
├─ Transactional emails
└─ SMTP setup

Status: ✅ READY (needs Gmail config)
```

---

## **🔧 SOURCE CODE (/src)**

### **Authentication**
```
src/auth-service.js (3.8 KB)
├─ User registration
├─ Login with JWT
├─ Refresh token generation
├─ API key generation
├─ Password hashing (bcrypt)
├─ Token verification
└─ Database transactions

Status: ✅ COMPLETE with all fixes
Security: ✅ Timing attack prevention
          ✅ Hardcoded secret removed
          ✅ Proper validation
```

### **Middleware**
```
src/auth-middleware.js (1.2 KB)
├─ JWT validation
├─ API key verification
├─ Role-based access control
└─ Account ID attachment

Status: ✅ COMPLETE
```

### **Security**
```
src/rate-limiter.js (3.2 KB)
├─ Public limiter (100 req/15min)
├─ Auth limiter (5 req/15min)
├─ Leads limiter (5 req/hour) ✨ NEW
├─ Tier-aware API limiter
└─ Memory leak prevention

Status: ✅ COMPLETE with memory cleanup
```

```
src/error-handler.js (2.8 KB)
├─ Standardized error responses
├─ Error code constants
├─ Error response formatting
├─ Global error middleware
└─ API error helpers

Status: ✅ COMPLETE
```

### **Data Processing**
```
src/schemas.js (2.1 KB)
├─ Input validation (Zod)
├─ Email validation
├─ Password requirements
├─ API request schemas
└─ Error messages

Status: ✅ COMPLETE
Password: 12+ chars, uppercase, lowercase, number, special char
Email: Valid format, no double dots, lowercase
```

```
src/usage-service.js (2.5 KB)
├─ Cost calculation
├─ Rate limit checking
├─ Tier pricing definitions
└─ Usage statistics

Status: ✅ COMPLETE
Pricing: Free/$0, Starter/$25, Pro/$125, Enterprise/Custom
```

```
src/pagination.js (1.8 KB)
├─ Pagination utilities
├─ Limit/offset handling
├─ Response formatting
└─ Pagination metadata

Status: ✅ COMPLETE
Default: 20 items/page
Max: 100 items/page
```

```
src/audit-service.js (1.5 KB)
├─ Event logging
├─ IP address extraction
├─ Audit event types
└─ Compliance logging

Status: ✅ COMPLETE
Events logged:
- Login success/failure
- Account creation
- Account deletion
- API key operations
```

```
src/transaction-helper.js (1.2 KB)
├─ Database transactions
├─ Error logging
└─ Atomic operations

Status: ✅ COMPLETE
Used by: Account creation, API key creation, Account deletion
```

---

## **🎨 FRONTEND FILES**

### **Landing Page**
```
index.html (84.5 KB)
├─ Professional marketing page
├─ Lead capture form
├─ Feature sections
├─ Pricing showcase
├─ CSS included (not extracted)
├─ Vanilla JavaScript
└─ No external dependencies (except fonts)

Status: ✅ UPDATED for API v1
API calls: POST /api/v1/leads
Form submission: Email validation, error handling
```

### **Admin Dashboard**
```
admin.html (19.7 KB)
├─ Lead management interface
├─ API authentication (x-admin-key header)
├─ Lead list with pagination
├─ Lead status updates
├─ Search functionality
└─ Admin controls

Status: ✅ UPDATED for API v1
API calls:
- GET /api/v1/admin/leads (list)
- PATCH /api/v1/admin/leads/{id}/status (update)
- GET /api/v1/health (status check)
```

---

## **📚 DOCUMENTATION**

### **API Documentation**
```
docs/API.md (8.2 KB)
├─ API base URL
├─ Authentication methods (JWT + API Key)
├─ All 12 endpoints documented
├─ Request/response examples
├─ Error handling
├─ Rate limiting info
├─ Code examples (cURL, Python, JavaScript)
└─ HTTP status codes

Status: ✅ COMPLETE and ACCURATE
Endpoints: 12 total
Authentication: JWT (access token) or API Key
Rate limits: Free (100/hr), Starter (5K/hr), Pro (50K/hr), Enterprise (unlimited)
```

### **Deployment Guide**
```
docs/DEPLOYMENT.md (12.4 KB)
├─ Heroku setup
├─ Railway setup
├─ AWS ECS/Fargate
├─ Self-hosted VPS
├─ Docker configuration
├─ HTTPS setup
├─ Environment variables
├─ Post-deployment testing
└─ Backup strategies

Status: ✅ COMPLETE
Recommended: Railway (easiest)
```

### **Migration Guide**
```
docs/MIGRATION.md (9.3 KB)
├─ Breaking changes
├─ Old → New endpoints
├─ Authentication migration
├─ Client code updates
├─ Database schema updates
└─ Rollback plan

Status: ✅ COMPLETE
Changes: /api → /api/v1/
Auth: token → accessToken + refreshToken
```

---

## **📊 BUSINESS DOCUMENTATION**

### **Strategic Documents**
```
COMPETITIVE_ADVANTAGE.md (15.5 KB)
├─ Market analysis
├─ 8 unfair advantages
├─ Competitor comparison
├─ Customer personas
├─ Revenue opportunity
├─ Positioning statement
└─ Customer testimonials

Status: ✅ COMPLETE
Key: Canadian-specific, clinically coherent, instant, cheap, compliant
```

```
ACTION_PLAN_2024-2026.md (30.1 KB)
├─ 4-phase roadmap
├─ Phase 1: Launch & Validate (Apr-Jun)
├─ Phase 2: Customer Acquisition (Jul-Sep)
├─ Phase 3: Revenue & Growth (Oct-Dec)
├─ Phase 4: Expansion (Jan-Jun 2025)
├─ Monthly targets
├─ Hiring plan
├─ Funding strategy
├─ Market trends
└─ KPI tracking

Status: ✅ COMPLETE
Year 1 Target: $1,500+ MRR by December
Customers: 50+ by end of 2024
```

```
IMPLEMENTATION_SUMMARY.md (12.4 KB)
├─ What was completed
├─ Security improvements
├─ Files created/modified
├─ Pre-deployment checklist
├─ Next steps by week
├─ Technical stack summary
└─ Revenue potential analysis

Status: ✅ COMPLETE
Production Ready: 85%
Security Grade: C+ (6.7/10)
```

---

## **🎨 DESIGN DOCUMENTATION**

### **Design System & Specifications**
```
DESIGN_BRIEF.md (25 KB) ✨ NEW
├─ Complete design system
├─ Colors, typography, spacing
├─ All 10 section specifications
├─ Component library requirements
├─ Responsive design breakpoints
├─ Animation specifications
└─ Design checklist

Status: ✅ READY FOR UI/UX PRO
Purpose: Guide for designer
Use with: UI/UX Pro tool
```

```
DESIGN_COPY.md (18 KB) ✨ NEW
├─ All marketing copy
├─ Section-by-section content
├─ Testimonials with quotes
├─ Pricing copy
├─ FAQ content
├─ CTA hierarchy
├─ Tone & voice guide
└─ Key messaging pillars

Status: ✅ READY FOR DESIGN
Purpose: Content layer for design
Includes: All headlines, subheadings, buttons, descriptions
```

```
UI_UX_QUICK_GUIDE.md (15 KB) ✨ NEW
├─ Step-by-step UI/UX Pro instructions
├─ Design system setup
├─ Component library specs
├─ 4-day design timeline
├─ Section-by-section guidance
├─ Mobile responsive design
├─ Common mistakes to avoid
└─ Handoff instructions

Status: ✅ READY FOR YOU
Purpose: Guide for using UI/UX Pro
Timeline: 4 days (Day 1-4 sequence)
```

---

## **🔧 CONFIGURATION FILES**

### **Package Management**
```
package.json (673 bytes)
├─ Project metadata
├─ Dependencies list
├─ Scripts (start, dev, test)
└─ Node.js version

Status: ✅ UPDATED
Main: server-new.js (was server.js)
Scripts:
- npm start → node server-new.js
- npm dev → node --watch server-new.js
- npm test → health checks
```

```
package-lock.json (52.9 KB)
├─ Locked dependency versions
├─ All sub-dependencies
└─ Reproducible installs

Status: ✅ COMPLETE
Installed packages: 40+ npm packages
Key: better-sqlite3, express, helmet, jsonwebtoken, bcryptjs, zod
```

### **Environment Setup**
```
.env.example (700 bytes)
├─ Template environment variables
├─ Required vars (JWT_SECRET, ADMIN_KEY)
├─ Optional vars (EMAIL, MAIL_PASS)
└─ Documentation

Status: ✅ COMPLETE
Use: Copy to .env and fill in values
Required for: JWT_SECRET, ADMIN_KEY, MAIL_USER, MAIL_PASS
```

---

## **🧪 TESTING & QUALITY**

### **Security Tests**
```
tests/security.test.js (7.3 KB)
├─ JWT validation tests
├─ Password hashing tests
├─ Rate limiter tests
├─ CSV injection prevention
├─ Email validation tests
├─ Password requirements tests
└─ API key security tests

Status: ✅ COMPLETE
Run: npm test
Coverage: All 11 CRITICAL fixes verified
```

---

## **🛠️ TOOLS & PLUGINS** (Installed)

### **Claude Code Plugin**
```
.claude-plugin/
├─ Plugin configuration
├─ Marketplace metadata
└─ Plugin integration

Includes:
- Code guidelines
- Architecture patterns
- Testing strategies
- Security standards
```

### **Agents & Skills**
```
.kiro/ (Kiro agents)
├─ Architect agent
├─ Code reviewer agent
├─ Security reviewer agent
├─ Database reviewer agent
└─ 28+ other specialized agents

.agents/ (Agent skills)
├─ API design patterns
├─ Backend patterns
├─ Frontend patterns
└─ 30+ other skills

.claude/ (Claude Code configuration)
├─ Rules & guardrails
├─ Development workflows
├─ Code standards
└─ Team configuration
```

---

## **📍 WHERE TO FIND SPECIFIC THINGS**

### **"Where is the backend?"**
→ `/home/user/synthmed/server-new.js`

### **"Where is the database?"**
→ `/home/user/synthmed/db.js` (logic)
→ `/home/user/synthmed/synthmed.db` (data file)

### **"Where are the API endpoints?"**
→ `/home/user/synthmed/server-new.js` (lines 170-600)

### **"Where is the landing page?"**
→ `/home/user/synthmed/index.html`

### **"Where is the admin dashboard?"**
→ `/home/user/synthmed/admin.html`

### **"Where is the API documentation?"**
→ `/home/user/synthmed/docs/API.md`

### **"Where are the deployment instructions?"**
→ `/home/user/synthmed/docs/DEPLOYMENT.md`

### **"Where is the business plan?"**
→ `/home/user/synthmed/ACTION_PLAN_2024-2026.md`

### **"Where is the competitive analysis?"**
→ `/home/user/synthmed/COMPETITIVE_ADVANTAGE.md`

### **"Where is the design brief?"**
→ `/home/user/synthmed/DESIGN_BRIEF.md`

### **"Where are the security details?"**
→ `/home/user/synthmed/CODE_REVIEW_FEEDBACK.md`

### **"Where is the implementation summary?"**
→ `/home/user/synthmed/IMPLEMENTATION_SUMMARY.md`

---

## **📋 KEY FILES BY PURPOSE**

### **To Deploy the Application**
1. `server-new.js` (main server)
2. `db.js` (database)
3. `package.json` (dependencies)
4. `.env` (configuration)
5. `docs/DEPLOYMENT.md` (instructions)

### **To Understand the API**
1. `docs/API.md` (complete reference)
2. `server-new.js` (endpoint code)
3. `src/schemas.js` (validation)
4. `src/auth-service.js` (authentication)

### **To Build the Frontend**
1. `DESIGN_BRIEF.md` (design system)
2. `DESIGN_COPY.md` (content)
3. `UI_UX_QUICK_GUIDE.md` (UI/UX instructions)
4. `index.html` (current landing)
5. `admin.html` (current admin)

### **To Understand Security**
1. `CODE_REVIEW_FEEDBACK.md` (audit report)
2. `tests/security.test.js` (test suite)
3. `src/auth-service.js` (authentication)
4. `src/rate-limiter.js` (rate limiting)
5. `src/error-handler.js` (error handling)

### **To Plan Business**
1. `ACTION_PLAN_2024-2026.md` (roadmap)
2. `COMPETITIVE_ADVANTAGE.md` (positioning)
3. `IMPLEMENTATION_SUMMARY.md` (status)

---

## **📦 TOTAL PROJECT SIZE**

```
Total Files: 100+
Code Files: 20 files
Documentation: 12 files
Plugins/Tools: 68+ files

Total Size:
- Code: ~150 KB
- Docs: ~150 KB
- Database: 65 KB
- Plugins: ~100 MB (node_modules)

Main Branch: feature/revenue-system-setup
Commits: 22
Status: Production Ready (85%)
```

---

## **✅ NEXT: DESIGN & DEVELOPMENT**

**Design Files (Ready for UI/UX Pro):**
- ✅ DESIGN_BRIEF.md
- ✅ DESIGN_COPY.md
- ✅ UI_UX_QUICK_GUIDE.md

**Files You'll Create:**
- 🎨 Landing page design (Figma export)
- 🎨 Mobile variants
- 🎨 Animation specs

**Files I'll Create (After Design):**
- 💻 New index.html (from design)
- 💻 New CSS (from design specs)
- 💻 Interactive components
- 💻 Responsive updates

---

**Everything is organized and ready! Pick any file above and I can help you with it.** 📂
