# SynthMed API Specification v1.0

**Base URL:** `https://synthmed.onrender.com/api/v1`
**Status:** Production Ready
**Last Updated:** April 2, 2026
**Compliance:** PIPEDA-compliant, healthcare-grade security

---

## Table of Contents

1. [Authentication](#authentication)
2. [Rate Limiting](#rate-limiting)
3. [Response Format](#response-format)
4. [Error Handling](#error-handling)
5. [Endpoints](#endpoints)
6. [Examples](#examples)
7. [Best Practices](#best-practices)
8. [SDKs & Libraries](#sdks--libraries)

---

## Authentication

### Two Methods Supported

#### 1. JWT Bearer Token (Recommended for Web/Frontend)
**When to use:** User-facing applications, web dashboards, interactive tools

```
Authorization: Bearer {jwt_token}
```

**Token Details:**
- Access token: 1 hour validity
- Refresh token: 30 days validity
- Cost: 12 bcryptjs rounds (NIST-approved)

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

#### 2. API Key (Recommended for Backend/Services)
**When to use:** Server-to-server, CI/CD pipelines, automation

```
Authorization: API-Key {api_key}
```

**Key Details:**
- Hashed in database (never stored in plaintext)
- Tied to specific account
- Can be rotated without downtime
- Includes metadata (name, created_at, expires_at)

**Headers:**
```http
Authorization: API-Key sk_live_abc123def456...
Content-Type: application/json
```

### Authentication Flow

```
1. Register/Login → Get JWT + refresh token
2. Use JWT for 1 hour
3. JWT expires → Use refresh token to get new JWT
4. Refresh token expires (30 days) → Re-authenticate
```

---

## Rate Limiting

**Tier-Based Limits (monthly):**

| Tier | Monthly Calls | Daily Limit | Burst Limit |
|------|---------------|-------------|------------|
| Free | 100 | ~3 | 5/min |
| Growth | 5,000 | ~165 | 50/min |
| Pro | 50,000 | ~1,650 | 500/min |
| Enterprise | Unlimited | Unlimited | Unlimited |

**Rate Limit Headers (in every response):**

```http
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4987
X-RateLimit-Reset: 1744060800
X-RateLimit-Tier: growth
```

**Handling Rate Limits:**

- **429 Too Many Requests** - Wait until `X-RateLimit-Reset` (Unix timestamp)
- **Exponential backoff recommended** - 1s, 2s, 4s, 8s
- **No retry-after header** - Use `X-RateLimit-Reset` instead

**Code Example (Exponential Backoff):**

```javascript
async function callAPIWithRetry(endpoint, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(endpoint, options);

      if (response.status === 429) {
        const resetTime = parseInt(response.headers.get('X-RateLimit-Reset'));
        const waitTime = Math.max(0, resetTime * 1000 - Date.now());
        console.log(`Rate limited. Waiting ${waitTime}ms...`);
        await new Promise(r => setTimeout(r, waitTime + 100)); // +100ms buffer
        continue;
      }

      return response;
    } catch (error) {
      if (i < retries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw error;
      }
    }
  }
}
```

---

## Response Format

### Success Response (200, 201)

```json
{
  "success": true,
  "data": { /* endpoint-specific data */ },
  "meta": {
    "timestamp": "2026-04-02T14:30:00.000Z",
    "request_id": "req_abc123def456",
    "api_version": "v1"
  }
}
```

### Error Response (4xx, 5xx)

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Email is required",
    "details": {
      "field": "email",
      "reason": "missing_required_field"
    }
  },
  "meta": {
    "timestamp": "2026-04-02T14:30:00.000Z",
    "request_id": "req_abc123def456",
    "api_version": "v1"
  }
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input (fix request) |
| 401 | Unauthorized | Missing/invalid authentication |
| 403 | Forbidden | Authenticated but no permission |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Email already exists, etc. |
| 429 | Too Many Requests | Rate limited (wait before retry) |
| 500 | Server Error | Retry with exponential backoff |
| 503 | Service Unavailable | Temporary outage (retry later) |

### Error Codes

**Authentication Errors:**
- `INVALID_CREDENTIALS` - Wrong email/password
- `INVALID_TOKEN` - JWT expired or malformed
- `INVALID_API_KEY` - API key not found or revoked
- `MISSING_AUTH_HEADER` - No authorization header provided

**Validation Errors:**
- `INVALID_REQUEST` - Malformed JSON or missing fields
- `INVALID_EMAIL` - Email format invalid
- `INVALID_TIER` - Tier doesn't exist
- `INVALID_DATE_RANGE` - Date logic error

**Business Logic Errors:**
- `QUOTA_EXCEEDED` - Monthly limit reached
- `ACCOUNT_SUSPENDED` - Account flagged
- `DUPLICATE_EMAIL` - Email already registered
- `API_KEY_REVOKED` - Key has been disabled

**Server Errors:**
- `INTERNAL_ERROR` - Server-side issue
- `SERVICE_UNAVAILABLE` - Maintenance or outage
- `DATABASE_ERROR` - Database connectivity issue

### Error Response Example

```json
{
  "success": false,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Monthly API call limit exceeded",
    "details": {
      "used": 5000,
      "limit": 5000,
      "reset_at": "2026-05-02T00:00:00Z",
      "upgrade_url": "https://synthmed.onrender.com/upgrade"
    }
  },
  "meta": {
    "timestamp": "2026-04-02T14:30:00.000Z",
    "request_id": "req_xyz789",
    "api_version": "v1"
  }
}
```

---

## Endpoints

### Authentication

#### Register Account
```
POST /auth/register
Content-Type: application/json

Request:
{
  "email": "engineer@company.com",
  "password": "SecurePass123!",
  "organization": "Company Name"
}

Response (201):
{
  "success": true,
  "data": {
    "account_id": 42,
    "email": "engineer@company.com",
    "organization": "Company Name",
    "tier": "free",
    "created_at": "2026-04-02T14:30:00Z"
  },
  "meta": { ... }
}

Error Cases:
- 400: INVALID_EMAIL, WEAK_PASSWORD
- 409: DUPLICATE_EMAIL
```

#### Login
```
POST /auth/login
Content-Type: application/json

Request:
{
  "email": "engineer@company.com",
  "password": "SecurePass123!"
}

Response (200):
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600,
    "account": {
      "account_id": 42,
      "email": "engineer@company.com",
      "organization": "Company Name",
      "tier": "free"
    }
  },
  "meta": { ... }
}

Error Cases:
- 400: INVALID_CREDENTIALS
- 401: ACCOUNT_SUSPENDED
```

#### Refresh Token
```
POST /auth/refresh
Content-Type: application/json

Request:
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response (200):
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600
  },
  "meta": { ... }
}

Error Cases:
- 401: INVALID_TOKEN (refresh token expired or invalid)
```

---

### Data Generation

#### Generate Synthetic Data
```
POST /data/generate
Authorization: Bearer {jwt_token}
Content-Type: application/json

Request:
{
  "records": 1000,
  "conditions": ["diabetes", "hypertension"],
  "age_range": [25, 75],
  "include_medications": true,
  "include_labs": true,
  "include_vitals": true,
  "provincial_distribution": "ontario:40,bc:30,alberta:20,other:10"
}

Response (200):
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "patient_001",
        "age": 58,
        "gender": "M",
        "province": "Ontario",
        "conditions": ["diabetes", "hypertension"],
        "medications": ["metformin", "lisinopril"],
        "vitals": {
          "systolic": 142,
          "diastolic": 88,
          "heart_rate": 76,
          "temperature": 98.6
        },
        "labs": {
          "glucose": 156,
          "HbA1c": 7.8,
          "creatinine": 1.0,
          "gfr": 85
        }
      },
      /* ... 999 more records ... */
    ],
    "total_records": 1000,
    "generated_at": "2026-04-02T14:30:00Z",
    "data_quality_score": 0.94,
    "cost_cents": 0
  },
  "meta": {
    "timestamp": "2026-04-02T14:30:00Z",
    "request_id": "req_data_123",
    "api_version": "v1"
  }
}

Query Parameters:
- records: 1-10000 (default 100)
- format: json, csv, parquet (default json)

Error Cases:
- 400: INVALID_REQUEST, INVALID_CONDITIONS
- 429: QUOTA_EXCEEDED (includes reset_at and upgrade_url)
```

#### Generate Preview (1 record, free)
```
POST /data/preview
Authorization: Bearer {jwt_token}
Content-Type: application/json

Request:
{
  "conditions": ["diabetes"],
  "age": 45
}

Response (200):
{
  "success": true,
  "data": {
    "record": {
      "id": "preview_001",
      "age": 45,
      "gender": "F",
      "province": "Ontario",
      "conditions": ["diabetes"],
      "medications": ["metformin"],
      "labs": {
        "glucose": 148,
        "HbA1c": 7.5
      }
    }
  },
  "meta": { ... }
}
```

---

### Account Management

#### Get Account Info
```
GET /accounts/me
Authorization: Bearer {jwt_token}

Response (200):
{
  "success": true,
  "data": {
    "account_id": 42,
    "email": "engineer@company.com",
    "organization": "Company Name",
    "tier": "growth",
    "stripe_customer_id": "cus_abc123",
    "created_at": "2026-03-15T10:00:00Z",
    "updated_at": "2026-04-02T14:30:00Z"
  },
  "meta": { ... }
}

Error Cases:
- 401: INVALID_TOKEN
```

---

### API Keys

#### Create API Key
```
POST /keys
Authorization: Bearer {jwt_token}
Content-Type: application/json

Request:
{
  "name": "Production Integration",
  "expires_in_days": 90
}

Response (201):
{
  "success": true,
  "data": {
    "id": "key_abc123",
    "key": "sk_live_abc123def456xyz789...",
    "name": "Production Integration",
    "created_at": "2026-04-02T14:30:00Z",
    "expires_at": "2026-07-01T14:30:00Z"
  },
  "meta": { ... }
}

Note: Key is only shown once at creation. Store it securely.
```

#### List API Keys
```
GET /keys
Authorization: Bearer {jwt_token}

Response (200):
{
  "success": true,
  "data": {
    "keys": [
      {
        "id": "key_abc123",
        "name": "Production Integration",
        "created_at": "2026-04-02T14:30:00Z",
        "expires_at": "2026-07-01T14:30:00Z",
        "last_used_at": "2026-04-02T14:25:00Z",
        "revoked_at": null
      }
    ]
  },
  "meta": { ... }
}
```

#### Revoke API Key
```
DELETE /keys/{key_id}
Authorization: Bearer {jwt_token}

Response (200):
{
  "success": true,
  "data": {
    "id": "key_abc123",
    "revoked_at": "2026-04-02T14:30:00Z"
  },
  "meta": { ... }
}
```

---

### Usage & Billing

#### Get Usage
```
GET /usage
Authorization: Bearer {jwt_token}

Query Parameters:
- period: month (default), week, day
- month: YYYY-MM (defaults to current month)

Response (200):
{
  "success": true,
  "data": {
    "tier": "growth",
    "period": "2026-04",
    "limit": 5000,
    "used": 1234,
    "remaining": 3766,
    "percentage_used": 24.68,
    "reset_at": "2026-05-01T00:00:00Z",
    "breakdown": {
      "/data/generate": 1200,
      "/data/preview": 34
    }
  },
  "meta": { ... }
}
```

#### Get Usage History
```
GET /usage/history
Authorization: Bearer {jwt_token}

Query Parameters:
- limit: 1-100 (default 20)
- offset: 0+ (default 0)
- start_date: YYYY-MM-DD
- end_date: YYYY-MM-DD

Response (200):
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "evt_123",
        "endpoint": "/data/generate",
        "records_generated": 1000,
        "timestamp": "2026-04-02T14:30:00Z",
        "response_code": 200
      }
    ],
    "pagination": {
      "total": 1234,
      "limit": 20,
      "offset": 0,
      "has_more": true
    }
  },
  "meta": { ... }
}
```

---

### Billing

#### Create Checkout Session
```
POST /billing/checkout
Authorization: Bearer {jwt_token}
Content-Type: application/json

Request:
{
  "tier": "growth",
  "trial_days": 14
}

Response (200):
{
  "success": true,
  "data": {
    "session_id": "cs_test_abc123",
    "url": "https://checkout.stripe.com/pay/cs_test_abc123",
    "expires_at": "2026-04-09T14:30:00Z"
  },
  "meta": { ... }
}

Error Cases:
- 400: INVALID_TIER
- 409: ALREADY_ON_TIER
```

#### Get Billing Portal
```
POST /billing/portal
Authorization: Bearer {jwt_token}

Response (200):
{
  "success": true,
  "data": {
    "url": "https://billing.stripe.com/..."
  },
  "meta": { ... }
}

Note: Redirects user to Stripe billing portal for self-service
```

---

## Examples

### Python Integration

```python
import requests
import json
from datetime import datetime, timedelta
import time

class SynthMedAPI:
    def __init__(self, base_url="https://synthmed.onrender.com/api/v1"):
        self.base_url = base_url
        self.access_token = None
        self.api_key = None

    def register(self, email, password, organization):
        """Register a new account"""
        response = requests.post(
            f"{self.base_url}/auth/register",
            json={
                "email": email,
                "password": password,
                "organization": organization
            }
        )
        return response.json()

    def login(self, email, password):
        """Login and get tokens"""
        response = requests.post(
            f"{self.base_url}/auth/login",
            json={"email": email, "password": password}
        )
        data = response.json()
        if data["success"]:
            self.access_token = data["data"]["access_token"]
        return data

    def generate_data(self, records=100, conditions=None, age_range=None):
        """Generate synthetic patient data"""
        payload = {
            "records": records,
            "conditions": conditions or ["diabetes"],
            "age_range": age_range or [18, 85],
            "include_medications": True,
            "include_labs": True
        }

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        response = requests.post(
            f"{self.base_url}/data/generate",
            json=payload,
            headers=headers
        )

        # Handle rate limiting with exponential backoff
        if response.status_code == 429:
            reset_time = int(response.headers.get("X-RateLimit-Reset", 0))
            wait_time = max(0, reset_time * 1000 - int(datetime.now().timestamp() * 1000))
            print(f"Rate limited. Waiting {wait_time}ms...")
            time.sleep((wait_time + 100) / 1000)
            return self.generate_data(records, conditions, age_range)

        return response.json()

    def create_api_key(self, name, expires_in_days=90):
        """Create an API key for server-to-server integration"""
        headers = {"Authorization": f"Bearer {self.access_token}"}

        response = requests.post(
            f"{self.base_url}/keys",
            json={
                "name": name,
                "expires_in_days": expires_in_days
            },
            headers=headers
        )

        data = response.json()
        if data["success"]:
            self.api_key = data["data"]["key"]
        return data

    def get_usage(self, period="month", month=None):
        """Get current usage stats"""
        params = {"period": period}
        if month:
            params["month"] = month

        headers = {"Authorization": f"Bearer {self.access_token}"}

        response = requests.get(
            f"{self.base_url}/usage",
            params=params,
            headers=headers
        )
        return response.json()

# Usage Example
if __name__ == "__main__":
    api = SynthMedAPI()

    # Register
    reg = api.register(
        email="ml-engineer@startup.com",
        password="SecurePassword123!",
        organization="HealthTech AI Inc"
    )
    print("Registered:", reg["success"])

    # Login
    login = api.login(
        email="ml-engineer@startup.com",
        password="SecurePassword123!"
    )
    print("Logged in:", login["success"])

    # Generate data
    data = api.generate_data(
        records=500,
        conditions=["diabetes", "hypertension"],
        age_range=[30, 70]
    )
    print(f"Generated {data['data']['total_records']} records")

    # Check usage
    usage = api.get_usage()
    print(f"Usage: {usage['data']['used']}/{usage['data']['limit']}")
```

### JavaScript/Node.js Integration

```javascript
class SynthMedAPI {
  constructor(baseUrl = "https://synthmed.onrender.com/api/v1") {
    this.baseUrl = baseUrl;
    this.accessToken = null;
    this.apiKey = null;
  }

  async register(email, password, organization) {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, organization })
    });
    return response.json();
  }

  async login(email, password) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (data.success) {
      this.accessToken = data.data.access_token;
    }
    return data;
  }

  async generateData(options = {}) {
    const {
      records = 100,
      conditions = ["diabetes"],
      ageRange = [18, 85],
      includeMedications = true,
      includeLabs = true
    } = options;

    const makeRequest = async (retries = 3) => {
      const response = await fetch(`${this.baseUrl}/data/generate`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          records,
          conditions,
          age_range: ageRange,
          include_medications: includeMedications,
          include_labs: includeLabs
        })
      });

      // Handle rate limiting
      if (response.status === 429) {
        const resetTime = parseInt(response.headers.get("X-RateLimit-Reset") || "0");
        const waitTime = Math.max(0, resetTime * 1000 - Date.now());
        console.log(`Rate limited. Waiting ${waitTime}ms...`);

        await new Promise(resolve => setTimeout(resolve, waitTime + 100));
        return makeRequest(retries - 1);
      }

      return response.json();
    };

    return makeRequest();
  }

  async getUsage(period = "month", month = null) {
    const params = new URLSearchParams({ period });
    if (month) params.append("month", month);

    const response = await fetch(`${this.baseUrl}/usage?${params}`, {
      headers: { "Authorization": `Bearer ${this.accessToken}` }
    });
    return response.json();
  }
}

// Usage
async function main() {
  const api = new SynthMedAPI();

  // Register
  const reg = await api.register(
    "engineer@company.com",
    "SecurePassword123!",
    "Company Name"
  );
  console.log("Registered:", reg.success);

  // Login
  const login = await api.login(
    "engineer@company.com",
    "SecurePassword123!"
  );
  console.log("Logged in:", login.success);

  // Generate data
  const data = await api.generateData({
    records: 1000,
    conditions: ["diabetes", "cancer"],
    ageRange: [25, 75]
  });
  console.log(`Generated ${data.data.total_records} records`);

  // Check usage
  const usage = await api.getUsage("month");
  console.log(`Usage: ${usage.data.used}/${usage.data.limit}`);
}

main().catch(console.error);
```

---

## Best Practices

### 1. Authentication
- ✅ Store tokens securely (never in localStorage for sensitive apps)
- ✅ Use environment variables for credentials (never hardcode)
- ✅ Rotate API keys regularly (create new, deprecate old)
- ✅ Use JWT for user-facing apps, API keys for backend services
- ✅ Always include `Content-Type: application/json` header

### 2. Error Handling
- ✅ Always check `response.success` before accessing `data`
- ✅ Implement exponential backoff for 429 errors
- ✅ Log `request_id` from meta for debugging with support
- ✅ Never log raw tokens/keys
- ✅ Handle 500 errors with retry logic (transient failures)

### 3. Rate Limiting
- ✅ Monitor `X-RateLimit-Remaining` header
- ✅ Implement alerting at 80% quota usage
- ✅ Never retry 429s immediately (wait for `X-RateLimit-Reset`)
- ✅ Consider caching results to avoid redundant API calls
- ✅ Batch requests when possible (generate 10K records once vs 100 times)

### 4. Data Handling
- ✅ Validate data format before processing
- ✅ Handle missing/null fields in responses
- ✅ Don't assume field order in CSV exports
- ✅ Implement idempotency for critical operations
- ✅ Archive generated data for audit trail

### 5. Security
- ✅ Only use HTTPS (API requires TLS 1.2+)
- ✅ Verify SSL certificates in production
- ✅ Use API keys for backend integrations only
- ✅ Rotate keys every 90 days
- ✅ Never commit keys to version control

### 6. Performance
- ✅ Use connection pooling for multiple requests
- ✅ Implement request timeouts (30 seconds recommended)
- ✅ Cache authentication tokens during validity period
- ✅ Use pagination for large data exports (limit 100 per request)
- ✅ Consider async/queue patterns for high-volume generation

---

## SDKs & Libraries

### Official SDKs
- **Python:** `pip install synthmed-sdk`
- **JavaScript/Node.js:** `npm install synthmed-sdk`
- **Python (async):** `pip install synthmed-sdk[async]`

### Community Libraries
- Ruby gem: `synthmed` (maintained by community)
- Go module: `github.com/synthmed/go-sdk`
- Java/Kotlin: `com.synthmed:synthmed-java-sdk`

### Integration Examples
- **Terraform:** `synthmed/synthmed-provider`
- **Postman:** Import collection: [postman-collection-link]
- **OpenAPI Generator:** Full OpenAPI spec available

---

## Support & Resources

- **API Status:** https://synthmed.onrender.com/health
- **API Documentation:** https://docs.synthmed.com
- **Email Support:** support@synthmed.com
- **Response Time:** <2 hours (Growth tier), <4 hours (Free tier)
- **Uptime SLA:** 99.9% (Pro/Enterprise), 99% (Free/Growth)

---

**Document Version:** 1.0
**Last Updated:** April 2, 2026
**Next Review:** April 16, 2026
