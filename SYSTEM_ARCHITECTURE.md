# 🏗️ SynthMed System Architecture & Workflow

**Overview:** Complete system design, data flow, and how everything works together

---

## 🔄 HIGH-LEVEL ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SYNTHMED PLATFORM                           │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│   FRONTEND LAYER     │         │   API LAYER          │
├──────────────────────┤         ├──────────────────────┤
│ • index.html         │────────▶│ • Express.js Server  │
│ • admin.html         │         │ • 12+ Endpoints      │
│ • Landing page       │         │ • REST API (/api/v1)│
│ • Lead capture form  │         │ • Health check       │
│ • Admin dashboard    │         │ • Authentication     │
└──────────────────────┘         └──────────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
        ┌───────────▼──────────┐ ┌──────▼────────────┐ ┌────▼─────────────┐
        │   SECURITY LAYER     │ │  SERVICE LAYER   │ │  DATA LAYER      │
        ├──────────────────────┤ ├──────────────────┤ ├──────────────────┤
        │ • JWT Tokens         │ │ • Auth Service   │ │ • SQLite DB      │
        │ • API Keys           │ │ • Usage Service  │ │ • 6 Tables       │
        │ • Rate Limiter       │ │ • Audit Service  │ │ • Prepared Stmts │
        │ • CORS Validation    │ │ • Transaction    │ │ • Indexes        │
        │ • Error Handler      │ │   Helper         │ │ • Transactions   │
        │ • Input Validation   │ │ • Pagination     │ │ • Backup ready   │
        └──────────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## 👤 USER JOURNEY (Complete Workflow)

### **Step 1: User Visits Website**
```
User Browser
    ↓
LOAD: http://synthmed.ca/
    ↓
Serve: index.html (landing page)
    ↓
Display: Features, pricing, demo, testimonials
```

### **Step 2: User Captures Lead**
```
User fills: Name, Email, Organization, Role, Message
    ↓
CLICK: "Try Free Demo"
    ↓
POST /api/v1/leads
    ↓
Validation (Zod schemas)
    ├─ Email format check
    ├─ Required fields check
    └─ Rate limiting (5/hour per IP)
    ↓
Database Insert
    ├─ Insert to leads table
    ├─ Log to audit_logs
    └─ Return success
    ↓
Response: 200 OK with lead ID
    ↓
User sees: "Thank you! Check your email"
```

### **Step 3: User Registers Account**
```
User fills: Email, Password
    ↓
CLICK: "Sign Up"
    ↓
POST /api/v1/auth/register
    ↓
Validation
    ├─ Email format (lowercase, no double dots)
    ├─ Password strength (12+ chars, mixed case, numbers, special)
    ├─ Check email not already registered
    └─ Rate limiting (5/15 min per IP)
    ↓
Hash Password (bcryptjs, timing-attack safe)
    ↓
Database Insert (transaction)
    ├─ Insert to accounts table
    ├─ Set tier to "free" (default)
    ├─ Log audit event (ACCOUNT_CREATED)
    └─ Commit transaction
    ↓
Generate Tokens
    ├─ Access Token (1 hour expiry)
    ├─ Refresh Token (30 days expiry)
    └─ Include "type" field (access vs refresh)
    ↓
Response: Tokens + account info
    ↓
User authenticated ✅
```

### **Step 4: User Logs In**
```
User fills: Email, Password
    ↓
CLICK: "Login"
    ↓
POST /api/v1/auth/login
    ↓
Find account by email
    ↓
Compare password (bcrypt, constant-time)
    ├─ If wrong: Still runs bcrypt (timing attack prevention)
    ├─ Response: 401 Unauthorized
    └─ Log audit event (LOGIN_FAILED)
    ↓
If correct:
    ├─ Log audit event (LOGIN_SUCCESS)
    ├─ Get user tier from accounts table
    ├─ Generate new tokens
    └─ Return tokens
    ↓
User authenticated ✅
```

### **Step 5: Generate Synthetic Data**
```
User fills: Condition, Gender, Age Range
    ↓
CLICK: "Generate Patient Record"
    ↓
POST /api/v1/generate
    ├─ Authorization header: Bearer {accessToken}
    ├─ Validate JWT token
    ├─ Extract account ID from token
    └─ Get tier from accounts table
    ↓
Rate Limiting Check
    ├─ Free: 100 req/hour
    ├─ Starter: 5,000 req/hour
    ├─ Pro: 50,000 req/hour
    └─ Enterprise: Unlimited
    ├─ If exceeded: 429 Too Many Requests
    └─ Continue if allowed
    ↓
Generate Synthetic Data
    ├─ Create clinically coherent record
    ├─ ICD-10-CA codes
    ├─ Realistic medications
    ├─ Correlated vitals/labs
    └─ Takes <100ms
    ↓
Record Usage (Transaction)
    ├─ Insert to usage_events table
    ├─ Track: account_id, records_count, cost_cents
    ├─ Calculate cost based on tier
    └─ Insert to audit_logs
    ├─ Commit transaction (all-or-nothing)
    └─ If fails: Rollback
    ↓
Response: Patient record + audit log
    ↓
Display: JSON/CSV/Parquet download options
```

---

## 🔐 AUTHENTICATION & AUTHORIZATION FLOW

### **Two Authentication Methods**

#### **Method 1: JWT (for web users)**
```
Registration/Login
    ↓
Generate Tokens:
    ├─ Access Token (1 hour, type: "access")
    ├─ Refresh Token (30 days, type: "refresh")
    └─ Both signed with JWT_SECRET
    ↓
Client stores: accessToken in memory
                refreshToken in httpOnly cookie
    ↓
Each API Request:
    ├─ Authorization header: Bearer {accessToken}
    ├─ Server validates signature
    ├─ Check token expiry
    ├─ Check token type
    └─ Extract accountId from payload
    ↓
Token expires → Client sends:
    POST /api/v1/auth/refresh
    └─ Body: {refreshToken}
    ↓
Server validates refresh token
    ├─ Check signature
    ├─ Check expiry
    ├─ Check type = "refresh"
    └─ Generate new access token
    ↓
Return new access token
    ↓
Continue using new token
```

#### **Method 2: API Keys (for programmatic access)**
```
User requests: POST /api/v1/api-keys
    ├─ Body: {name: "My Integration"}
    └─ Authorization: Bearer {accessToken}
    ↓
Generate API Key
    ├─ Format: sk_{random_32_chars}
    ├─ Hashed value in database
    ├─ Expires: 365 days from now
    └─ Can be rotated manually
    ↓
Store in database:
    ├─ api_keys table
    ├─ Columns: account_id, key_hash, expires_at, created_at
    └─ Log audit event (API_KEY_CREATED)
    ↓
Return to user (only shown once!)
    ├─ User stores securely
    └─ Never shown again
    ↓
Using API Key:
    POST /api/v1/generate
    ├─ Header: x-api-key: sk_xxxxx
    ├─ (NOT in query string - prevented!)
    ├─ Server validates key
    ├─ Check key hasn't expired
    ├─ Extract account_id
    └─ Proceed with request
    ↓
Response: Patient data
    ↓
Log: API_KEY_USED audit event
```

---

## 💾 DATABASE STRUCTURE & FLOW

### **Table 1: ACCOUNTS**
```
accounts
├─ id (PRIMARY KEY)
├─ email (UNIQUE)
├─ password_hash
├─ tier (free/starter/pro/enterprise)
├─ status (active/suspended)
├─ created_at
└─ updated_at

User Account Registration Flow:
1. User submits email + password
2. Hash password (bcryptjs)
3. INSERT into accounts
4. Return account_id
5. Generate JWT using account_id
```

### **Table 2: API_KEYS**
```
api_keys
├─ id (PRIMARY KEY)
├─ account_id (FOREIGN KEY → accounts)
├─ key_hash (hashed API key)
├─ name (user-defined name)
├─ expires_at (365 days from creation)
├─ revoked (boolean)
├─ last_used_at
├─ created_at
└─ updated_at

API Key Usage Flow:
1. User creates key: POST /api/v1/api-keys
2. Generate random 32 chars: sk_xxxxx
3. Hash it (bcryptjs)
4. INSERT into api_keys with expires_at
5. Return unhashed key (only once!)
6. On request: Verify key exists, not expired, not revoked
```

### **Table 3: USAGE_EVENTS**
```
usage_events
├─ id (PRIMARY KEY)
├─ account_id (FOREIGN KEY → accounts)
├─ api_key_id (FOREIGN KEY → api_keys, nullable)
├─ endpoint (which endpoint called)
├─ records_count (how many records generated)
├─ cost_cents (charge in cents)
├─ timestamp
└─ metadata (JSON)

Billing Flow:
1. User generates 500 records
2. Cost calculation:
   ├─ Free: $0
   ├─ Starter: $0.50/1000 = $0.25
   ├─ Pro: $0.25/1000 = $0.125
   └─ Enterprise: $0.10/1000 = $0.05
3. INSERT usage_events row
4. Sum usage for billing period
5. Invoice at month end
```

### **Table 4: AUDIT_LOGS**
```
audit_logs
├─ id (PRIMARY KEY)
├─ account_id (FOREIGN KEY → accounts)
├─ action (LOGIN_SUCCESS, API_KEY_CREATED, etc.)
├─ resource (which resource affected)
├─ resource_id (which record)
├─ ip_address (source IP)
├─ user_agent (browser info)
├─ timestamp
└─ metadata (JSON details)

Audit Trail Flow:
1. User action occurs (login, create key, generate data)
2. Extract IP from headers (x-forwarded-for, etc.)
3. INSERT audit_logs row
4. Retain for compliance (30+ days)
5. Use for security monitoring
```

### **Table 5: LEADS**
```
leads
├─ id (PRIMARY KEY)
├─ name
├─ email
├─ organization
├─ role
├─ message
├─ status (new/contacted/qualified/lost)
├─ created_at
└─ updated_at

Lead Capture Flow:
1. User fills form on landing page
2. POST /api/v1/leads
3. Validate input (Zod schemas)
4. Check rate limit (5/hour per IP)
5. INSERT into leads table
6. Send email notification (optional)
7. Return success
8. Admin views in dashboard
```

### **Table 6: PREVIEW_EVENTS**
```
preview_events
├─ id (PRIMARY KEY)
├─ event_type (demo_generated, form_viewed, etc.)
├─ data (JSON - what was generated)
├─ ip_address
├─ timestamp
└─ user_agent

Demo Tracking Flow:
1. User generates demo on landing page
2. Record event type
3. Store generated patient data
4. Track conversion funnel
5. Analytics: Who tried demo → Who signed up
```

---

## 📊 RATE LIMITING FLOW

### **Public Endpoints (No Auth)**
```
Request arrives
    ↓
Extract IP address from headers
    ├─ x-forwarded-for (proxy)
    ├─ x-real-ip (nginx)
    └─ socket.remoteAddress (direct)
    ↓
Check publicLimiter (express-rate-limit)
    ├─ Limit: 100 requests per 15 minutes per IP
    ├─ Store in Map: IP → [timestamps]
    └─ Window: 15 minutes
    ↓
If exceeded:
    ├─ Response: 429 Too Many Requests
    ├─ Header: Retry-After: 60
    └─ Stop request processing
    ↓
If allowed:
    └─ Continue to handler
```

### **Auth Endpoints (Login)**
```
Request arrives at /api/v1/auth/login
    ↓
Extract IP address
    ↓
Check authLimiter
    ├─ Limit: 5 requests per 15 minutes per IP
    ├─ skipSuccessfulRequests: true
    └─ (Only count failed attempts)
    ↓
If exceeded:
    ├─ Response: 429 Too Many Requests
    └─ Stop processing
    ↓
Process login attempt
    ├─ Correct password: Not counted (skipSuccessfulRequests)
    └─ Wrong password: Counted toward limit
```

### **API Endpoints (Tier-based)**
```
Request arrives at /api/v1/generate
    ↓
Extract API key or JWT
    ↓
Get account_id from auth
    ↓
Query accounts table
    ├─ Get tier (free/starter/pro/enterprise)
    └─ Get account_id
    ↓
Create tier-specific limiter
    ├─ Free: 100 requests/hour
    ├─ Starter: 5,000 requests/hour
    ├─ Pro: 50,000 requests/hour
    └─ Enterprise: null (unlimited)
    ↓
Check limiter:
    ├─ Key: account_id (not IP!)
    ├─ Check current hour's requests
    ├─ Compare to tier limit
    └─ Window: 1 hour
    ↓
If exceeded:
    ├─ Response: 429 Too Many Requests
    ├─ Header: RateLimit-Limit: 50000
    ├─ Header: RateLimit-Remaining: 0
    └─ Header: RateLimit-Reset: {unix_timestamp}
    ↓
If allowed:
    ├─ Increment request counter
    └─ Process request
```

### **Memory Cleanup (Prevents Memory Leak)**
```
Every 5 minutes:
    ↓
For each limiter's Map:
    ├─ Get all entries
    ├─ Check each timestamp
    ├─ Remove old entries (>15 min ago for publicLimiter)
    ├─ Remove empty IP entries
    └─ Trim old data
    ↓
Result:
    ├─ Memory usage stays bounded
    ├─ No unbounded growth
    └─ Server stays responsive
```

---

## 🔄 REQUEST VALIDATION PIPELINE

```
User Request Arrives
    ↓
Step 1: PARSE & EXTRACT
    ├─ Parse JSON body
    ├─ Extract headers
    ├─ Extract URL params
    └─ Extract query params
    ↓
Step 2: RATE LIMIT CHECK
    ├─ Check IP-based limit (public)
    ├─ Check auth limit (login)
    └─ Check tier limit (API)
    ├─ If exceeded: Return 429
    └─ Continue if allowed
    ↓
Step 3: AUTHENTICATION
    ├─ Extract token from Authorization header
    ├─ Or extract API key from x-api-key header
    ├─ Validate signature/existence
    ├─ Check expiry
    └─ Extract account_id
    ├─ If invalid: Return 401
    └─ Continue if valid
    ↓
Step 4: INPUT VALIDATION (Zod schemas)
    ├─ Check required fields
    ├─ Validate email format
    ├─ Validate password strength
    ├─ Validate ID parameters (parseInt, isInteger)
    └─ Validate limits/offsets
    ├─ If invalid: Return 400 with error details
    └─ Continue if valid
    ↓
Step 5: BUSINESS LOGIC
    ├─ Query database
    ├─ Process request
    ├─ Generate synthetic data
    ├─ Write to database (with transaction)
    └─ Log audit event
    ├─ If error: Return 500 (with error code)
    └─ Continue if success
    ↓
Step 6: RESPONSE FORMATTING
    ├─ Format response as JSON
    ├─ Include metadata (pagination, etc.)
    ├─ Escape CSV values (if exporting)
    └─ Set response headers
    ↓
Step 7: ERROR HANDLING
    ├─ If any step fails
    ├─ Catch error
    ├─ Format error response
    ├─ Include error code (VALIDATION_FAILED, UNAUTHORIZED, etc.)
    ├─ Log to audit (failures)
    └─ Return standardized error
    ↓
Response sent to client
```

---

## 🎯 COMPLETE WORKFLOW EXAMPLE: Generate Synthetic Data

```
═══════════════════════════════════════════════════════════════════
COMPLETE FLOW: User Generates Synthetic Patient Data
═══════════════════════════════════════════════════════════════════

1️⃣  CLIENT SIDE (Browser)
   ├─ User selects: Condition (Diabetes), Gender (Female), Age (50)
   ├─ User clicks: "Generate Patient Record"
   └─ JavaScript sends: POST /api/v1/generate

2️⃣  NETWORK LAYER
   ├─ Request includes: Authorization header with JWT token
   ├─ Body: {condition: "diabetes", gender: "female", age: "50"}
   └─ Travels over HTTPS (encrypted)

3️⃣  SERVER RECEIVES REQUEST (server-new.js)
   ├─ Parse request
   ├─ Extract Authorization header
   ├─ Extract body parameters
   └─ Route to /api/v1/generate handler

4️⃣  AUTHENTICATION MIDDLEWARE (auth-middleware.js)
   ├─ Extract token: "Bearer eyJhbGciOiJIUzI1NiI..."
   ├─ Call verifyToken(token)
   ├─ Decode JWT payload
   ├─ Check signature (verify with JWT_SECRET)
   ├─ Check expiry: token.exp > now()
   ├─ Extract: account_id = 123
   ├─ Attach to request: req.auth = {accountId: 123, type: "access"}
   └─ If invalid: Return 401 Unauthorized

5️⃣  RATE LIMITING (rate-limiter.js)
   ├─ Get account_id from req.auth
   ├─ Query accounts table → Get tier = "pro"
   ├─ Create tier-based limiter
   ├─ Check: 50,000 requests/hour allowed
   ├─ Current hour requests: 23,456
   ├─ Check: 23,456 < 50,000 ✓
   └─ Continue (rate limit not exceeded)

6️⃣  INPUT VALIDATION (schemas.js)
   ├─ Validate condition parameter
   │  ├─ Check: Required ✓
   │  ├─ Check: Valid condition ✓
   │  └─ Continue
   ├─ Validate gender parameter
   │  ├─ Check: Valid value ✓
   │  └─ Continue
   ├─ Validate age parameter
   │  ├─ Check: Numeric ✓
   │  ├─ Check: Range 0-120 ✓
   │  └─ Continue
   └─ All valid: Continue to business logic

7️⃣  DATABASE QUERY (db.js)
   ├─ Query accounts table
   │  ├─ SELECT * FROM accounts WHERE id = 123
   │  ├─ Result: {id: 123, email: "user@example.com", tier: "pro"}
   │  └─ Continue
   └─ Get rate limit for tier: 50,000/hour

8️⃣  SYNTHETIC DATA GENERATION
   ├─ Generate clinically coherent patient:
   │  ├─ Age: 52
   │  ├─ Gender: Female
   │  ├─ Diagnosis: Type 2 Diabetes (E11.00)
   │  ├─ Medications: Metformin 500mg, Lisinopril 10mg
   │  ├─ Blood Pressure: 138/86 mmHg
   │  ├─ Glucose: 9.4 mmol/L (correlates with HbA1c)
   │  ├─ HbA1c: 8.1% (consistent with glucose)
   │  ├─ BMI: 28.4 (risk factor)
   │  ├─ Comorbidities: Hypertension
   │  └─ Readmission Risk: No
   ├─ Takes: <100ms
   └─ Result: Realistic, coherent patient object

9️⃣  TRANSACTION: Record Usage (src/transaction-helper.js)
   ├─ BEGIN TRANSACTION
   │  ├─ INSERT into usage_events
   │  │  ├─ account_id: 123
   │  │  ├─ endpoint: "generate"
   │  │  ├─ records_count: 1
   │  │  ├─ cost_cents: 12 (Pro tier: $0.125 per 1000)
   │  │  └─ timestamp: now()
   │  ├─ INSERT into audit_logs
   │  │  ├─ account_id: 123
   │  │  ├─ action: "DATA_GENERATED"
   │  │  ├─ ip_address: "203.0.113.42"
   │  │  └─ timestamp: now()
   │  └─ COMMIT (both inserts succeed together)
   └─ If error: ROLLBACK (both revert together)

🔟  RESPONSE FORMATTING (server-new.js)
   ├─ Create response object:
   │  ├─ ok: true
   │  ├─ data: {
   │  │   patientId: "P-2847392",
   │  │   age: 52,
   │  │   diagnosis: "Type 2 Diabetes",
   │  │   ... (full record)
   │  │ }
   │  ├─ cost: {
   │  │   cents: 12,
   │  │   currency: "USD"
   │  │ }
   │  └─ timestamp: "2026-03-28T..."
   ├─ Set headers:
   │  ├─ Content-Type: application/json
   │  ├─ RateLimit-Limit: 50000
   │  ├─ RateLimit-Remaining: 26543
   │  └─ RateLimit-Reset: 1711728000
   └─ Send response: 200 OK

1️⃣1️⃣  CLIENT RECEIVES RESPONSE
   ├─ Parse JSON
   ├─ Display patient record:
   │  ├─ Name: Jane Smith
   │  ├─ Diagnosis: Type 2 Diabetes
   │  ├─ BP: 138/86
   │  └─ Labs: Glucose 9.4, HbA1c 8.1%
   ├─ Show export options:
   │  ├─ [Copy JSON]
   │  ├─ [Download CSV]
   │  └─ [Download Parquet]
   └─ User clicks: [Copy JSON]

1️⃣2️⃣  COMPLETE ✅
   ├─ Patient record generated: <100ms
   ├─ Cost charged: $0.0012
   ├─ Usage recorded: 1 request, 1 record
   ├─ Audit logged: IP, timestamp, action
   ├─ User happy: Got realistic data instantly
   └─ Platform ready: For next request

═══════════════════════════════════════════════════════════════════
```

---

## 🎨 ARCHITECTURE LAYERS (Bottom to Top)

```
┌──────────────────────────────────────────────────────┐
│  PRESENTATION LAYER                                  │
│  ├─ Landing page (index.html)                        │
│  ├─ Admin dashboard (admin.html)                     │
│  ├─ API responses (JSON/CSV/Parquet)                │
│  └─ Error messages                                   │
└──────────────────────────────────────────────────────┘
                        ↕ HTTP/REST
┌──────────────────────────────────────────────────────┐
│  APPLICATION LAYER (Express.js)                      │
│  ├─ Routes & handlers                                │
│  ├─ Request processing                               │
│  ├─ Response formatting                              │
│  └─ Error handling                                   │
└──────────────────────────────────────────────────────┘
                        ↕ Internal
┌──────────────────────────────────────────────────────┐
│  BUSINESS LOGIC LAYER                                │
│  ├─ auth-service.js (authentication)                 │
│  ├─ usage-service.js (billing)                       │
│  ├─ pagination.js (list handling)                    │
│  ├─ audit-service.js (logging)                       │
│  └─ transaction-helper.js (atomic operations)        │
└──────────────────────────────────────────────────────┘
                        ↕ Database calls
┌──────────────────────────────────────────────────────┐
│  DATA ACCESS LAYER                                   │
│  ├─ db.js (prepared statements)                      │
│  ├─ Queries (SELECT, INSERT, UPDATE, DELETE)        │
│  ├─ Transactions (begin, commit, rollback)           │
│  └─ Indexes (for performance)                        │
└──────────────────────────────────────────────────────┘
                        ↕ File system
┌──────────────────────────────────────────────────────┐
│  STORAGE LAYER                                       │
│  └─ synthmed.db (SQLite database file)               │
└──────────────────────────────────────────────────────┘

SECURITY LAYERS (Cross-cutting)
├─ Authentication (JWT + API Keys)
├─ Authorization (Role-based access)
├─ Rate Limiting (By IP, by tier)
├─ Input Validation (Zod schemas)
├─ Error Handling (Standardized responses)
├─ Encryption (HTTPS/TLS in production)
└─ Audit Logging (All actions tracked)
```

---

## 📈 DATA FLOW DIAGRAM

```
USER REQUEST
    │
    ├─ (1) VALIDATION
    │   ├─ Zod schema validation
    │   └─ Rate limit check
    │
    ├─ (2) AUTHENTICATION
    │   ├─ Verify JWT token
    │   │  OR
    │   └─ Verify API key
    │
    ├─ (3) AUTHORIZATION
    │   ├─ Get user tier
    │   └─ Check permissions
    │
    ├─ (4) PROCESSING
    │   ├─ Generate synthetic data
    │   ├─ Calculate cost
    │   └─ Prepare response
    │
    ├─ (5) PERSISTENCE
    │   ├─ BEGIN TRANSACTION
    │   ├─ INSERT usage_events
    │   ├─ INSERT audit_logs
    │   └─ COMMIT TRANSACTION
    │
    ├─ (6) RESPONSE
    │   ├─ Format JSON
    │   ├─ Set headers
    │   └─ Send 200 OK
    │
    └─ USER RECEIVES DATA ✅
```

---

## 🚀 DEPLOYMENT FLOW

```
Code Development
    ↓
Commit to feature/revenue-system-setup
    ↓
Push to GitHub
    ↓
Railway detects new push
    ↓
Build process:
    ├─ npm install
    ├─ Copy all files
    ├─ Set environment variables
    └─ Start: node server-new.js
    ↓
Server starts on port 3000
    ├─ Load .env variables
    ├─ Validate JWT_SECRET (32+ chars)
    ├─ Validate ADMIN_KEY (32+ chars)
    ├─ Connect to database (synthmed.db)
    ├─ Initialize all tables
    ├─ Set up security headers (Helmet.js)
    ├─ Configure CORS (ALLOWED_ORIGINS)
    ├─ Initialize rate limiters
    └─ Server ready
    ↓
HTTPS enabled (Let's Encrypt)
    ├─ Automatic certificate
    ├─ Auto-renewal
    └─ HTTPS redirect
    ↓
Configure custom domain
    ├─ Point DNS CNAME to Railway
    └─ Propagate (5-10 min)
    ↓
https://synthmed.ca online ✅
    ↓
Monitor
    ├─ Watch logs
    ├─ Monitor CPU/memory
    ├─ Track error rates
    └─ Health checks
```

---

## 📊 HOW SYNTHMED MAKES MONEY

```
User Signs Up (Free Tier)
    ├─ Gets: 1,000 records/month free
    ├─ Cost to us: ~$0.25
    ├─ Revenue: $0
    ├─ Purpose: Lead magnet
    └─ Next: Upgrade to paid

        ↓ CONVERSION

User Upgrades to Starter ($25/month)
    ├─ Gets: 50,000 records/month
    ├─ Cost to us: ~$15 (at $0.30/1000)
    ├─ Revenue: $25/month
    ├─ Margin: $10/month
    └─ Payment: Stripe/Paddle

        ↓ EXPANSION

User Upgrades to Pro ($125/month)
    ├─ Gets: 500,000 records/month
    ├─ Cost to us: ~$150 (at $0.30/1000)
    ├─ Revenue: $125/month
    ├─ Margin: -$25/month (initially)
    ├─ Purpose: Gateway to enterprise
    └─ Value: High usage lock-in

        ↓ PREMIUM

User Contacts for Enterprise
    ├─ Gets: Unlimited records
    ├─ Cost to us: Varies
    ├─ Revenue: $5,000+/month (custom)
    ├─ Margin: High (50%+)
    └─ Includes: Dedicated support, custom features

ANNUAL REVENUE PROJECTION
├─ Conservative (10F + 5S + 2P): $4,500/year
├─ Moderate (50F + 20S + 5P): $13,500/year
└─ Optimistic (200F + 50S + 10P + 1E): $90,000/year
```

---

## ✅ FINAL SUMMARY: How SynthMed Works

**In one sentence:**
SynthMed is a **REST API that generates clinically coherent synthetic Canadian healthcare data**, with tiered pricing, rate limiting, audit logging, and JWT/API key authentication.

**The workflow:**
1. **User visits** → Lands on marketing page
2. **User captures lead** → Form submission to /leads endpoint
3. **User registers** → Account created, JWT tokens issued
4. **User generates data** → Synthetic patient record created in <100ms
5. **Usage tracked** → Cost calculated and logged
6. **Payment** → Monthly billing based on tier
7. **Audit logged** → All actions tracked for compliance

**Architecture:**
- **Frontend:** index.html + admin.html + landing page
- **API:** 12+ REST endpoints with JWT/API key auth
- **Business Logic:** 6 utility modules (auth, rate limit, audit, etc.)
- **Database:** SQLite with 6 tables, transactions, indexes
- **Security:** Helmet.js, CORS, rate limiting, input validation
- **Deployment:** Railway with auto-HTTPS

**You're now ready to deploy and design the landing page!** 🚀

