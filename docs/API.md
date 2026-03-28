# SynthMed API Reference v1

Complete API documentation for SynthMed synthetic patient data generation service.

---

## Base URL

```
http://localhost:3000/api/v1
```

Production:
```
https://api.synthmed.ca/api/v1
```

---

## Authentication Methods

### 1. JWT Token (For Account Management)

Use for accessing your account, managing API keys, and viewing usage.

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

**Get a token:**
```bash
POST /auth/login
```

### 2. API Key (For Data Generation)

Use for generating synthetic records in production.

```bash
x-api-key: sk_your_api_key_here
```

**Create a key:**
```bash
POST /api-keys
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Rate Limits

Rate limits are tier-based and reset hourly:

| Tier | Requests/Hour | Cost/1000 Records |
|------|---|---|
| Free | 100 | $0 |
| Starter | 5,000 | $0.50 |
| Pro | 50,000 | $0.25 |
| Enterprise | Unlimited | $0.10 |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2024-03-28T22:30:00Z
```

---

## Error Handling

All errors follow this format:

```json
{
  "ok": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "errors": {
    "fieldName": ["Error message"]
  }
}
```

**Common Error Codes:**
- `UNAUTHORIZED` - Missing or invalid authentication
- `INVALID_TOKEN` - JWT token expired or invalid
- `INVALID_API_KEY` - API key not found or revoked
- `VALIDATION_ERROR` - Request validation failed
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `AUTH_RATE_LIMIT` - Too many login attempts
- `FORBIDDEN` - Insufficient permissions

---

## Authentication Endpoints

### Register

Create a new SynthMed account.

```http
POST /auth/register
Content-Type: application/json

{
  "email": "team@hospital.ai",
  "organization": "Hospital AI Lab",
  "password": "SecurePassword123"
}
```

**Response (201 Created):**
```json
{
  "ok": true,
  "message": "Account created successfully",
  "account": {
    "id": 1,
    "email": "team@hospital.ai",
    "organization": "Hospital AI Lab",
    "tier": "free",
    "status": "active"
  }
}
```

**Validation Rules:**
- `email`: Valid email address, unique
- `organization`: 2-200 characters
- `password`: 8+ chars, 1+ uppercase, 1+ number

---

### Login

Authenticate and receive JWT token.

```http
POST /auth/login
Content-Type: application/json

{
  "email": "team@hospital.ai",
  "password": "SecurePassword123"
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "account": {
    "id": 1,
    "email": "team@hospital.ai",
    "organization": "Hospital AI Lab",
    "tier": "free"
  }
}
```

**Token Expiry:** 24 hours

---

## Account Endpoints

### Get Account Details

Retrieve your account information.

```http
GET /account
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200 OK):**
```json
{
  "ok": true,
  "account": {
    "id": 1,
    "email": "team@hospital.ai",
    "organization": "Hospital AI Lab",
    "tier": "free",
    "status": "active",
    "createdAt": "2024-03-28T20:00:00Z"
  }
}
```

---

### Create API Key

Generate a new API key for programmatic access.

```http
POST /api-keys
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Production API Key"
}
```

**Response (201 Created):**
```json
{
  "ok": true,
  "apiKey": {
    "id": 42,
    "key": "sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "name": "Production API Key",
    "createdAt": "2024-03-28T20:05:00Z"
  }
}
```

**Important:** Save your key immediately. You won't be able to view it again!

---

### Get Usage Statistics

View your API usage and costs.

```http
GET /usage
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200 OK):**
```json
{
  "ok": true,
  "usage": {
    "totalRequests": 2543,
    "totalRecords": 125430,
    "totalCostCents": 3135,
    "totalCostDollars": "31.35"
  }
}
```

---

## Data Generation Endpoints

### Generate Preview Record

Generate a single synthetic patient record. Public endpoint with stricter rate limiting.

```http
POST /generate/preview
Content-Type: application/json

{
  "province": "ON",
  "conditionCategory": "diabetes"
}
```

**Query Parameters (Optional):**
- `province`: ON|BC|AB|QC|NS|MB|SK|NB|NL|PE|YT|NT|NU|random (default: random)
- `conditionCategory`: cardiovascular|diabetes|respiratory|mental-health|random (default: random)

**Response (200 OK):**
```json
{
  "ok": true,
  "record": {
    "patient_id": "SYN-CA-4521",
    "age": 52,
    "sex": "Female",
    "province_code": "ON",
    "province": "Ontario",
    "icd10_primary": "E11",
    "diagnosis_label": "Type 2 Diabetes Mellitus",
    "medication": "Metformin 500mg",
    "bmi": 28.4,
    "bp_mmhg": "138/86",
    "glucose_mmol": 9.4,
    "hba1c_pct": 8.1,
    "los_days": 5,
    "readmit_30d": false,
    "synthetic": true
  },
  "metadata": {
    "generator_version": "v1",
    "validated": true,
    "generated_at": "2024-03-28T20:10:00Z"
  }
}
```

---

### Generate Batch Records

Generate multiple synthetic records. Requires API key authentication.

```http
POST /generate/batch
x-api-key: sk_your_api_key_here
Content-Type: application/json

{
  "province": "random",
  "conditionCategory": "random",
  "count": 100,
  "format": "csv"
}
```

**Body Parameters:**
- `province`: ON|BC|AB|QC|NS|MB|SK|NB|NL|PE|YT|NT|NU|random (default: random)
- `conditionCategory`: cardiovascular|diabetes|respiratory|mental-health|random (default: random)
- `count`: 1-100 records (default: 10)
- `format`: csv|json (default: csv)

**CSV Response (200 OK):**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="synthmed_batch_100records.csv"

patient_id,age,sex,province_code,province,icd10_primary,diagnosis_label,medication,bmi,bp_mmhg,glucose_mmol,hba1c_pct,los_days,readmit_30d,synthetic
SYN-CA-1234,45,Male,BC,British Columbia,J44,COPD,Tiotropium Inhaler,26.8,158/94,5.9,5.7,7,false,true
SYN-CA-5678,67,Female,ON,Ontario,E11,Type 2 Diabetes Mellitus,Metformin 500mg,31.2,144/90,11.2,9.3,8,true,true
...
```

**JSON Response (200 OK):**
```json
{
  "ok": true,
  "records": [
    {
      "patient_id": "SYN-CA-1234",
      "age": 45,
      ...
    }
  ],
  "metadata": {
    "count": 100,
    "generator_version": "v1",
    "generated_at": "2024-03-28T20:15:00Z"
  }
}
```

---

## Lead Capture Endpoint

### Submit Lead

Submit a contact form request for a sample dataset.

```http
POST /leads
Content-Type: application/json

{
  "name": "Dr. Sarah Johnson",
  "email": "sarah@hospital.ca",
  "organization": "Toronto General Hospital",
  "role": "AI Research Lead",
  "message": "Interested in bulk dataset for ML training"
}
```

**Body Parameters:**
- `name`: 1-100 characters (required)
- `email`: Valid email (required, unique)
- `organization`: 1-200 characters (required)
- `role`: 0-100 characters (optional)
- `message`: 0-1000 characters (optional)

**Response (201 Created):**
```json
{
  "ok": true,
  "message": "Sample request received. We will be in touch within 24 hours.",
  "lead_id": 42
}
```

An email confirmation will be sent to the provided address.

---

## Usage Examples

### Python

```python
import requests

# Authentication
response = requests.post(
    'http://localhost:3000/api/v1/auth/login',
    json={
        'email': 'team@hospital.ai',
        'password': 'SecurePassword123'
    }
)
token = response.json()['token']

# Generate batch
response = requests.post(
    'http://localhost:3000/api/v1/generate/batch',
    headers={'x-api-key': 'sk_your_api_key_here'},
    json={
        'count': 100,
        'format': 'csv',
        'conditionCategory': 'diabetes'
    }
)

# Save CSV
with open('patient_data.csv', 'w') as f:
    f.write(response.text)
```

### JavaScript/Node.js

```javascript
// Authentication
const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'team@hospital.ai',
    password: 'SecurePassword123'
  })
});

const { token } = await loginRes.json();

// Generate batch
const batchRes = await fetch('http://localhost:3000/api/v1/generate/batch', {
  method: 'POST',
  headers: {
    'x-api-key': 'sk_your_api_key_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    count: 100,
    format: 'json',
    conditionCategory: 'cardiovascular'
  })
});

const { records } = await batchRes.json();
console.log(`Generated ${records.length} records`);
```

### cURL

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"team@hospital.ai","password":"SecurePassword123"}' \
  | jq -r '.token')

# Create API key
curl -X POST http://localhost:3000/api/v1/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My API Key"}'

# Generate batch
curl -X POST http://localhost:3000/api/v1/generate/batch \
  -H "x-api-key: sk_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "count": 50,
    "format": "csv",
    "province": "ON"
  }' \
  > data.csv
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 400 | Bad Request - Validation error |
| 401 | Unauthorized - Auth required/invalid |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Server Error - Unexpected error |

---

## Webhooks (Coming Soon)

Subscribe to events:
- `record.generated` - When a record is generated
- `usage.milestone` - When usage reaches threshold
- `account.upgraded` - When tier is upgraded

---

## Support

- **Email**: api-support@synthmed.ca
- **Slack**: [Join our Slack community](https://synthmed-slack.com)
- **Documentation**: https://docs.synthmed.ca
- **Status**: https://status.synthmed.ca

---

**Last Updated:** March 28, 2024
**API Version:** 1.0.0
